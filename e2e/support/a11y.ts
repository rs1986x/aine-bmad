import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>

// WCAG 2.1 level A + AA only. `best-practice`, `wcag22*`, and AAA tags are
// deliberately excluded so the CI gate matches the story's conformance target.
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const
export const AXE_STATES = [
  'populated-list',
  'empty-state',
  'inline-edit-open',
  'delete-dialog-open',
  'load-failure',
] as const
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
    target: readonly unknown[]
    html?: string
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
  targets: string[]
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

function stableTargetKey(node: ScannedIncomplete['nodes'][number]): string {
  const target = node.target
    .map((part) => (typeof part === 'string' ? part : JSON.stringify(part)))
    .join(' ')
    .replace(/#_r_[\da-z]+_/gi, '#[react-id]')
  const openingTag = node.html
    ?.match(/^<[^>]+>/)?.[0]
    .replace(/\s+id=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/_r_[\da-z]+_/gi, '[react-id]')
    .replace(/\s+/g, ' ')

  return openingTag ? `${target} ${openingTag}` : target
}

// Pin stable element identity as well as the result shape. Generated React ids
// are normalized, while the element's tag and non-generated attributes retain
// enough identity to catch an incomplete check moving to different content.
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
      targets: result.nodes.map(stableTargetKey).sort(),
    }))
    .sort((first, second) => first.id.localeCompare(second.id))
}

// Removes evidence from earlier runs so a state that was renamed or deleted
// cannot leave a stale artifact behind that still satisfies CI's
// `if-no-files-found: error` check.
export async function clearAxeResults(): Promise<void> {
  await rm(resultsDir, { recursive: true, force: true })
}

export function missingAxeStates(fileNames: readonly string[]): string[] {
  return AXE_STATES.filter(
    (state) =>
      !fileNames.some(
        (fileName) => fileName === `${state}.json` || fileName.startsWith(`${state}.retry-`),
      ),
  )
}

export async function assertAxeResultManifest(): Promise<void> {
  const fileNames = await readdir(resultsDir).catch(() => [])
  const missing = missingAxeStates(fileNames)
  if (missing.length > 0) {
    throw new Error(`Missing axe evidence for required states: ${missing.join(', ')}`)
  }
}

// Resolves the element's text colour against its composited solid-colour
// ancestor stack. Paint that cannot be measured reliably in computed styles
// fails closed instead of producing an invented ratio.
function measureContrast(element: Element) {
  type Color = [number, number, number, number]

  const parse = (value: string): Color => {
    const channels = (value.match(/[\d.]+/g) ?? []).map(Number)
    return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0, channels[3] ?? 1]
  }
  const composite = (foreground: Color, background: Color): Color => {
    const alpha = foreground[3] + background[3] * (1 - foreground[3])
    if (alpha === 0) return [0, 0, 0, 0]
    return [
      (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) / alpha,
      (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) / alpha,
      (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) / alpha,
      alpha,
    ]
  }
  const luminance = ([red, green, blue]: Color) => {
    const channel = (value: number) => {
      const ratio = value / 255
      return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue)
  }

  const style = getComputedStyle(element)
  const chain: Element[] = []
  for (let node: Element | null = element; node; node = node.parentElement) {
    chain.unshift(node)
  }

  let background: Color = [255, 255, 255, 1]
  let backgroundSource = 'the page canvas'
  const unsupportedEffects: string[] = []
  let unsupportedBackground: string[] = []

  for (const node of chain) {
    const nodeStyle = getComputedStyle(node)
    const source = node.tagName.toLowerCase() + (node.className ? `.${node.className}` : '')
    if (Number(nodeStyle.opacity) !== 1) unsupportedEffects.push(`${source} opacity`)
    if (nodeStyle.mixBlendMode !== 'normal') unsupportedEffects.push(`${source} blend mode`)

    const layer = parse(nodeStyle.backgroundColor)
    if (layer[3] === 1) {
      background = layer
      backgroundSource = source
      unsupportedBackground = []
    } else if (layer[3] > 0) {
      background = composite(layer, background)
      backgroundSource = `${source} composited over ${backgroundSource}`
    }

    if (nodeStyle.backgroundImage !== 'none') {
      unsupportedBackground.push(`${source} background image`)
    }
  }

  if (style.textShadow !== 'none') unsupportedEffects.push('text shadow')
  const unsupportedPaint = [...unsupportedEffects, ...unsupportedBackground]
  if (unsupportedPaint.length > 0) {
    throw new Error(`Cannot safely measure contrast through ${unsupportedPaint.join(', ')}`)
  }

  const foreground = composite(parse(style.color), background)
  const fontSize = parseFloat(style.fontSize)
  const fontWeight = Number(style.fontWeight) || 400
  const lighter = Math.max(luminance(foreground), luminance(background))
  const darker = Math.min(luminance(foreground), luminance(background))

  return {
    ratio: (lighter + 0.05) / (darker + 0.05),
    foreground: `rgb(${foreground.slice(0, 3).map(Math.round).join(', ')})`,
    background: `rgb(${background.slice(0, 3).map(Math.round).join(', ')})`,
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
export async function assertReadableContrast(
  page: Page,
  state: string,
  selectors: readonly string[],
): Promise<void> {
  for (const selector of selectors) {
    const measured = await page.locator(selector).evaluate(measureContrast)
    const minimum = measured.isLargeText ? CONTRAST_MINIMUM_LARGE : CONTRAST_MINIMUM_NORMAL

    expect(
      measured.ratio,
      `Contrast of "${selector}" in the "${state}" state was measured directly: ` +
        `${measured.foreground} on ${measured.background} (from ${measured.backgroundSource})`,
    ).toBeGreaterThanOrEqual(minimum)
  }
}

async function assertUndecidedContrastIsReadable(
  page: Page,
  results: AxeResults,
  state: string,
): Promise<void> {
  const selectors = results.incomplete
    .filter((entry) => entry.id === 'color-contrast')
    .flatMap((result) => result.nodes.map((node) => node.target.join(' ')))
  await assertReadableContrast(page, state, selectors)
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
  const results = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze()

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
