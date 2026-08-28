import { expect, test } from '@playwright/test'

import { scanState } from '../support/a11y'
import {
  addInput,
  addTodo,
  deleteButton,
  editButton,
  interceptTodoList,
  openApp,
  rowCheckbox,
  todoItem,
  toggleTodo,
  TODOS_ROUTE,
  uniqueTodo,
} from '../support/app'

// The local stack keeps a named volume and `cleanupE2eTodos` only removes rows
// this suite created, so a genuinely empty or failing list is not reachable
// against the real database. Intercepting the collection request is what makes
// those states deterministic; the rendered DOM is all axe needs.
// `stack.spec.ts` still owns the real backend-down proof.

test.describe.configure({ retries: 0 })

// Eight rows with realistic (UUID-stamped, wrapping) descriptions. The count is
// load-bearing: measured against the running app, the list only grows tall
// enough to paint a row behind the vertically centred dialog somewhere between
// two and six rows of this length, and that overlap is precisely what makes axe
// give up on the dialog description's background. Left to whatever the shared
// database happens to hold, the state's `incomplete` set flips between one entry
// and none, which is no basis for pinning anything.
const DIALOG_FIXTURE = Array.from({ length: 8 }, (_, index) => ({
  id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  description: `e2e a11y-dialog-fixture-${index} 1f0a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a50`,
  completed: false,
  createdAt: '2026-08-27T12:00:00.000Z',
  updatedAt: '2026-08-27T12:00:00.000Z',
}))

test('populated list is free of critical and serious violations', async ({ page }) => {
  const active = uniqueTodo('a11y-active')
  const done = uniqueTodo('a11y-completed')

  try {
    await interceptTodoList(page, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )
    await openApp(page)
    await addTodo(page, active)
    await addTodo(page, done)
    await toggleTodo(page, done, false)

    const activeRow = todoItem(page, active)
    const completedRow = todoItem(page, done, true)
    await expect(completedRow).toBeVisible()
    // Completion is carried by checkbox state plus strike-through, never by color
    // alone — assert both cues before handing the DOM to axe.
    await expect(rowCheckbox(page, done, true)).toBeChecked()
    await expect(completedRow.getByText(done, { exact: true })).toHaveCSS(
      'text-decoration-line',
      'line-through',
    )
    await expect(activeRow).toBeVisible()

    // `.todo-item__actions` sits at `opacity: 0` until its row is hovered or holds
    // focus, and axe's paint-sensitive rules skip what is not drawn. Reveal both
    // rows — one by hover, one by focus — so Edit and Delete are actually part of
    // the scanned surface rather than silently excluded from it.
    await completedRow.hover()
    await rowCheckbox(page, active).focus()
    await expect(activeRow.locator('.todo-item__actions')).toHaveCSS('opacity', '1')
    await expect(completedRow.locator('.todo-item__actions')).toHaveCSS('opacity', '1')

    await scanState(page, 'populated-list', [])
  } finally {
    await page.unroute(TODOS_ROUTE)
  }
})

test('empty state is free of critical and serious violations', async ({ page }) => {
  try {
    await interceptTodoList(page, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    )

    await openApp(page)
    await expect(page.getByRole('heading', { name: 'No todos yet.' })).toBeVisible()
    await expect(addInput(page)).toBeVisible()

    await scanState(page, 'empty-state', [])
  } finally {
    await page.unroute(TODOS_ROUTE)
  }
})

test('open inline editor is free of critical and serious violations', async ({ page }) => {
  const description = uniqueTodo('a11y-edit')

  await openApp(page)
  await addTodo(page, description)
  await editButton(page, description).click()

  try {
    const editor = page.getByRole('textbox', { name: `Edit description for ${description}` })
    await expect(editor).toBeVisible()

    await scanState(page, 'inline-edit-open', [])
  } finally {
    // Leave the row out of edit mode so the state cannot leak into a retry.
    await page.getByRole('button', { name: 'Cancel' }).click()
  }
})

test('open delete dialog is free of critical and serious violations', async ({ page }) => {
  const description = DIALOG_FIXTURE[0].description

  try {
    await interceptTodoList(page, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(DIALOG_FIXTURE),
      }),
    )

    await openApp(page)
    await deleteButton(page, description).click()

    const dialog = page.getByRole('dialog', { name: 'Delete this todo?' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()

    // The pinned entry below exists only because a row is painted behind the
    // description. Assert that directly, so a layout change that removes the
    // overlap reports its own cause instead of surfacing as a mismatched pin.
    const overlapped = await dialog
      .locator('.delete-dialog__description')
      .evaluate((element: HTMLElement) => {
        const rect = element.getBoundingClientRect()
        return document
          .elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
          .some((node) => node.classList.contains('todo-item'))
      })
    expect(overlapped, 'a todo row sits behind the dialog description').toBe(true)

    // axe cannot resolve a background through that overlap, so it reports the
    // check as undecided rather than passing. `scanState` measures the pair
    // itself — 6.00:1, resolved in docs/accessibility-audit.md.
    await scanState(page, 'delete-dialog-open', [
      {
        id: 'color-contrast',
        messageKeys: ['elmPartiallyObscuring'],
        nodeCount: 1,
        targets: ['#[react-id] <p class="delete-dialog__description">'],
      },
    ])
  } finally {
    const dialog = page.getByRole('dialog', { name: 'Delete this todo?' })
    if (await dialog.isVisible()) await page.keyboard.press('Escape')
    await page.unroute(TODOS_ROUTE)
  }
})

test('load failure is free of critical and serious violations', async ({ page }) => {
  try {
    await interceptTodoList(page, (route) => route.abort('failed'))

    // Not `openApp`: the load-failure branch renders the banner instead of the
    // add form, so waiting on the add input would time out.
    await page.goto('/')
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert.getByRole('button', { name: 'Retry' })).toBeVisible()

    await scanState(page, 'load-failure', [])
  } finally {
    await page.unroute(TODOS_ROUTE)
  }
})
