import { expect, test } from '@playwright/test'

import {
  AXE_STATES,
  WCAG_TAGS,
  assertReadableContrast,
  blockingViolations,
  missingAxeStates,
  summarizeIncomplete,
  type ScannedIncomplete,
  type ScannedViolation,
} from '../support/a11y'

test.describe.configure({ retries: 0 })

// The scans themselves can only ever report what the app does. These self-tests
// pin the configuration and exercise failure paths so a gate regression cannot
// quietly turn every future run into a clean pass.

function violation(id: string, impact?: string | null): ScannedViolation {
  return {
    id,
    ...(impact === undefined ? {} : { impact }),
    helpUrl: `https://dequeuniversity.com/rules/axe/${id}`,
    nodes: [{ target: [`#${id}`] }],
  }
}

function incomplete(id: string, messageKeys: (string | undefined)[]): ScannedIncomplete {
  return {
    id,
    nodes: messageKeys.map((messageKey, index) => ({
      target: [`#${id}-${index}`],
      html: `<p class="${id}-${index}">Example</p>`,
      any: [{ data: messageKey === undefined ? null : { messageKey } }],
      all: [],
      none: [],
    })),
  }
}

test('the gate uses exactly the required WCAG 2.1 A and AA tags', () => {
  expect(WCAG_TAGS).toEqual(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
})

test('the gate blocks critical, serious, and unrated violations', () => {
  const blocked = blockingViolations([
    violation('critical-rule', 'critical'),
    violation('serious-rule', 'serious'),
    violation('moderate-rule', 'moderate'),
    violation('minor-rule', 'minor'),
    violation('null-impact-rule', null),
    violation('absent-impact-rule'),
  ])

  expect(blocked.map((entry) => entry.id)).toEqual([
    'critical-rule',
    'serious-rule',
    'null-impact-rule',
    'absent-impact-rule',
  ])
})

test('the gate lets a scan with only moderate and minor findings through', () => {
  expect(blockingViolations([])).toEqual([])
  expect(
    blockingViolations([violation('moderate-rule', 'moderate'), violation('minor-rule', 'minor')]),
  ).toEqual([])
})

test('a blocked violation reports its rule id, impact, help URL, and target', () => {
  expect(blockingViolations([violation('color-contrast', 'serious')])).toEqual([
    {
      id: 'color-contrast',
      impact: 'serious',
      helpUrl: 'https://dequeuniversity.com/rules/axe/color-contrast',
      targets: ['#color-contrast'],
    },
  ])
})

test('incomplete results reduce to rule id, message keys, and node count', () => {
  expect(
    summarizeIncomplete([
      incomplete('color-contrast', ['elmPartiallyObscuring', 'elmPartiallyObscuring']),
      incomplete('aria-allowed-attr', [undefined]),
    ]),
  ).toEqual([
    {
      id: 'aria-allowed-attr',
      messageKeys: [],
      nodeCount: 1,
      targets: ['#aria-allowed-attr-0 <p class="aria-allowed-attr-0">'],
    },
    {
      id: 'color-contrast',
      messageKeys: ['elmPartiallyObscuring'],
      nodeCount: 2,
      targets: [
        '#color-contrast-0 <p class="color-contrast-0">',
        '#color-contrast-1 <p class="color-contrast-1">',
      ],
    },
  ])
})

test('an incomplete result that changes its message key no longer matches', () => {
  const pinned = summarizeIncomplete([incomplete('color-contrast', ['elmPartiallyObscuring'])])
  const drifted = summarizeIncomplete([incomplete('color-contrast', ['bgImage'])])

  expect(drifted).not.toEqual(pinned)
})

test('an incomplete result that moves to another target no longer matches', () => {
  const pinned = incomplete('color-contrast', ['elmPartiallyObscuring'])
  const moved = incomplete('color-contrast', ['elmPartiallyObscuring'])
  moved.nodes[0]!.target = ['#different-target']

  expect(summarizeIncomplete([moved])).not.toEqual(summarizeIncomplete([pinned]))
})

test('the evidence manifest requires every scanned state', () => {
  const complete = AXE_STATES.map((state) => `${state}.json`)
  expect(missingAxeStates(complete)).toEqual([])
  expect(missingAxeStates(complete.filter((fileName) => fileName !== 'load-failure.json'))).toEqual(
    ['load-failure'],
  )
})

test('direct contrast enforcement rejects an unreadable unresolved result', async ({ page }) => {
  await page.setContent(
    '<main style="background: rgb(255, 255, 255)">' +
      '<p class="low-contrast" style="color: rgb(170, 170, 170)">Unreadable text</p>' +
      '</main>',
  )

  await expect(
    assertReadableContrast(page, 'synthetic-low-contrast', ['.low-contrast']),
  ).rejects.toThrow()
})
