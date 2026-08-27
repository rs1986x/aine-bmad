import { expect, test } from '@playwright/test'

import {
  blockingViolations,
  summarizeIncomplete,
  type ScannedIncomplete,
  type ScannedViolation,
} from '../support/a11y'

// The scans themselves can only ever report what the app does. These exercise
// the gate against synthetic results so a mistyped tag list or impact filter
// cannot quietly turn every future run into a clean pass. No browser and no
// `axe-results/` write: these are pure functions.

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
    nodes: messageKeys.map((messageKey) => ({
      any: [{ data: messageKey === undefined ? null : { messageKey } }],
      all: [],
      none: [],
    })),
  }
}

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
    { id: 'aria-allowed-attr', messageKeys: [], nodeCount: 1 },
    { id: 'color-contrast', messageKeys: ['elmPartiallyObscuring'], nodeCount: 2 },
  ])
})

test('an incomplete result that changes its message key no longer matches', () => {
  const pinned = summarizeIncomplete([incomplete('color-contrast', ['elmPartiallyObscuring'])])
  const drifted = summarizeIncomplete([incomplete('color-contrast', ['bgImage'])])

  expect(drifted).not.toEqual(pinned)
})
