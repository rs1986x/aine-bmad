import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>

// WCAG 2.1 level A + AA only. `best-practice`, `wcag22*`, and AAA tags are
// deliberately excluded so the CI gate matches the story's conformance target.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const BLOCKING_IMPACTS = ['critical', 'serious']

// WCAG 2.1 AA 1.4.3: 4.5:1 for body text, 3:1 once text is large.
const CONTRAST_MINIMUM_NORMAL = 4.5
const CONTRAST_MINIMUM_LARGE = 3

const resultsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../axe-results')

// Structural shapes rather than the axe-core types, so the pure gate functions
// below can be exercised with hand-built fixtures. Real axe results satisfy them.
export interface ScannedViolation {
  id: string
  impact?: string | null
  helpUrl: string
  nodes: readonly { target: readonly unknown[] }[]
}

export interface ScannedIncomplete {
  id: string
  nodes: readonly {
    any: readonly { data: unknown }[]
    all: readonly { data: unknown }[]
    none: readonly { data: unknown }[]
  }[]
}

export interface BlockingViolation {
  id: string
  impact: string | null
  helpUrl: string
  targets: string[]
}

export interface IncompleteSignature {
  id: string
  messageKeys: string[]
  nodeCount: number
}

// Fails closed: a violation axe left unrated blocks just like a critical one.
// Treating a missing impact as "not blocking" would let an unrated rule pass in
// silence, which is the one failure mode a gate must not have.
export function blockingViolations(violations: readonly ScannedViolation[]): BlockingViolation[] {
  return violations
    .filter((violation) => violation.impact == null || BLOCKING_IMPACTS.includes(violation.impact))
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? null,
      helpUrl: violation.helpUrl,
      targets: violation.nodes.map((node) => node.target.join(' ')),
    }))
}

function messageKeyOf(check: { data: unknown }): string | undefined {
  const { data } = check
  if (typeof data !== 'object' || data === null || !('messageKey' in data)) return undefined
  const { messageKey } = data as { messageKey: unknown }
  return typeof messageKey === 'string' ? messageKey : undefined
}

// Reduces `incomplete` to fields that survive a re-render. Node targets are
// deliberately excluded: React `useId` values (`#_r_3_`) shift with tree shape,
// so pinning them would fail for reasons that have nothing to do with a11y.
export function summarizeIncomplete(
  incomplete: readonly ScannedIncomplete[],
): IncompleteSignature[] {
  return incomplete
    .map((result) => ({
      id: result.id,
      messageKeys: [
        ...new Set(
          result.nodes.flatMap((node) =>
            [...node.any, ...node.all, ...node.none]
              .map(messageKeyOf)
              .filter((key) => key !== undefined),
          ),
        ),
      ].sort(),
      nodeCount: result.nodes.length,
    }))
    .sort((first, second) => first.id.localeCompare(second.id))
}

// Removes evidence from earlier runs so a state that was renamed or deleted
// cannot leave a stale artifact behind that still satisfies CI's
// `if-no-files-found: error` check.
export async function clearAxeResults(): Promise<void> {
  await rm(resultsDir, { recursive: true, force: true })
}

// Resolves the element's own colour and the nearest opaque background painted
// behind it, then returns the WCAG 2.1 contrast ratio of the pair.
function measureContrast(element: Element) {
  const parse = (value: string) => (value.match(/[\d.]+/g) ?? []).map(Number)
  const luminance = ([red, green, blue]: number[]) => {
    const channel = (value: number) => {
      const ratio = value / 255
      return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  }

  const style = getComputedStyle(element)
  const foreground = parse(style.color).slice(0, 3)

  // Walk up until something actually paints. A translucent layer contributes
  // nothing on its own, so the first fully opaque ancestor is what the text is
  // really read against — the same reasoning axe declines to make on its own.
  let node: Element | null = element
  let background = [255, 255, 255]
  let backgroundSource = 'the page canvas'
  while (node) {
    const [red, green, blue, alpha = 1] = parse(getComputedStyle(node).backgroundColor)
    if (alpha === 1) {
      background = [red, green, blue]
      backgroundSource = node.tagName.toLowerCase() + (node.className ? `.${node.className}` : '')
      break
    }
    node = node.parentElement
  }

  const fontSize = parseFloat(style.fontSize)
  const fontWeight = Number(style.fontWeight) || 400
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))

  return {
    ratio: (lighter + 0.05) / (darker + 0.05),
    foreground: `rgb(${foreground.join(', ')})`,
    background: `rgb(${background.join(', ')})`,
    backgroundSource,
    isLargeText: fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700),
  }
}

// axe reports `color-contrast` as `incomplete` when something overlaps the text
// and it will not guess which layer supplies the background. That verdict comes
// with `contrastRatio: 0`, so it says nothing about the colours themselves —
// measured against the running app, an unreadable 2.32:1 token yields the exact
// same undecided entry as the readable 6.00:1 one it ships with. Measuring the
// pair here is what turns those back into a decision instead of a shrug.
async function assertUndecidedContrastIsReadable(
  page: Page,
  results: AxeResults,
  state: string,
): Promise<void> {
  for (const result of results.incomplete.filter((entry) => entry.id === 'color-contrast')) {
    for (const node of result.nodes) {
      const selector = node.target.join(' ')
      const measured = await page.locator(selector).evaluate(measureContrast)
      const minimum = measured.isLargeText ? CONTRAST_MINIMUM_LARGE : CONTRAST_MINIMUM_NORMAL

      expect(
        measured.ratio,
        `axe could not decide the contrast of "${selector}" in the "${state}" state, so it was ` +
          `measured directly: ${measured.foreground} on ${measured.background} ` +
          `(from ${measured.backgroundSource})`,
      ).toBeGreaterThanOrEqual(minimum)
    }
  }
}

// Scans the page as it currently stands, writes the per-state evidence file,
// fails on any critical, serious, or unrated violation, holds `incomplete` to
// the set the audit resolved by hand, and re-decides by measurement every
// contrast check axe left open.
export async function scanState(
  page: Page,
  state: string,
  expectedIncomplete: readonly IncompleteSignature[],
): Promise<AxeResults> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

  // Playwright retries twice in CI. Without the attempt suffix a scan that fails
  // and then passes would overwrite its own failing artifact with a clean one.
  const attempt = test.info().retry
  const fileName = attempt === 0 ? `${state}.json` : `${state}.retry-${attempt}.json`

  await mkdir(resultsDir, { recursive: true })
  await writeFile(
    path.join(resultsDir, fileName),
    `${JSON.stringify(
      {
        state,
        attempt: attempt + 1,
        url: results.url,
        timestamp: results.timestamp,
        tags: WCAG_TAGS,
        testEngine: results.testEngine,
        violations: results.violations,
        // `incomplete` ships alongside `violations` because axe could not decide
        // these on its own: an empty `violations` array is not by itself a pass.
        incomplete: results.incomplete,
      },
      null,
      2,
    )}\n`,
  )

  expect(
    blockingViolations(results.violations),
    `axe found critical, serious, or unrated WCAG 2.1 A/AA violations in the "${state}" state ` +
      `(full report: e2e/axe-results/${fileName})`,
  ).toEqual([])

  expect(
    summarizeIncomplete(results.incomplete),
    `axe "incomplete" results drifted in the "${state}" state. Each one is a check axe ` +
      `could not decide alone, so a new or changed entry needs resolving in ` +
      `docs/accessibility-audit.md before this expectation is updated ` +
      `(full report: e2e/axe-results/${fileName})`,
  ).toEqual(expectedIncomplete)

  await assertUndecidedContrastIsReadable(page, results, state)

  return results
}
