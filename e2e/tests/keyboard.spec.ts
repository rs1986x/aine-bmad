import { expect, test, type Locator, type Page } from '@playwright/test'

import {
  addInput,
  addTodo,
  deleteButton,
  deleteTodo,
  editButton,
  editTodo,
  interceptTodoList,
  openApp,
  rowCheckbox,
  todoItem,
  TODOS_ROUTE,
  uniqueTodo,
} from '../support/app'

// 200% browser page zoom of a 1280×720 window is, in CSS pixels, a 640×360
// viewport. Both are applied explicitly so the halving does not depend on
// whatever viewport the Playwright project happens to default to.
const FULL_VIEWPORT = { width: 1280, height: 720 }
const ZOOMED_VIEWPORT = { width: FULL_VIEWPORT.width / 2, height: FULL_VIEWPORT.height / 2 }
const MIN_HIT_AREA = 44

function addButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Add', exact: true })
}

function saveButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Save', exact: true })
}

function cancelButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Cancel', exact: true })
}

// The 22px checkbox is deliberately wrapped in a 44px <label>; the label is what
// takes the pointer, so it — not the input — is the control's effective target.
function checkboxTarget(page: Page, description: string): Locator {
  return todoItem(page, description).locator('label:has(input[type="checkbox"])')
}

function alphaOf(color: string): number {
  const channels = color.match(/[\d.]+/g)
  return channels && channels.length === 4 ? Number(channels[3]) : 1
}

// A non-zero outline width proves nothing on its own: `outline-style: none` and
// a fully transparent `outline-color` both still report a width.
async function expectVisibleFocusRing(name: string, control: Locator): Promise<void> {
  await expect(control, `${name} is not focused`).toBeFocused()

  const ring = await control.evaluate((element) => {
    type Color = [number, number, number, number]
    const parse = (value: string): Color => {
      const channels = (value.match(/[\d.]+/g) ?? []).map(Number)
      return [channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0, channels[3] ?? 1]
    }
    const composite = (foreground: Color, background: Color): Color => {
      const alpha = foreground[3] + background[3] * (1 - foreground[3])
      return [
        (foreground[0] * foreground[3] + background[0] * background[3] * (1 - foreground[3])) /
          alpha,
        (foreground[1] * foreground[3] + background[1] * background[3] * (1 - foreground[3])) /
          alpha,
        (foreground[2] * foreground[3] + background[2] * background[3] * (1 - foreground[3])) /
          alpha,
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
    const ancestors: Element[] = []
    for (let node = element.parentElement; node; node = node.parentElement) ancestors.unshift(node)
    let background: Color = [255, 255, 255, 1]
    for (const ancestor of ancestors) {
      background = composite(parse(getComputedStyle(ancestor).backgroundColor), background)
    }
    const outline = composite(parse(style.outlineColor), background)
    const lighter = Math.max(luminance(outline), luminance(background))
    const darker = Math.min(luminance(outline), luminance(background))

    return {
      width: parseFloat(style.outlineWidth),
      style: style.outlineStyle,
      color: style.outlineColor,
      contrast: (lighter + 0.05) / (darker + 0.05),
    }
  })

  expect(ring.width, `${name} focus ring width`).toBeGreaterThan(0)
  expect(ring.style, `${name} focus ring style`).not.toBe('none')
  expect(
    alphaOf(ring.color),
    `${name} focus ring color ${ring.color} is transparent`,
  ).toBeGreaterThan(0)
  expect(ring.contrast, `${name} focus ring contrast`).toBeGreaterThanOrEqual(3)
}

// jsdom performs no layout, so the CSS unit test can only read the stylesheet
// text. This measures the box the browser actually painted.
async function expectHitArea(name: string, control: Locator): Promise<void> {
  await expect(control, `${name} is not attached`).toBeVisible()
  const box = await control.boundingBox()
  if (!box) throw new Error(`${name} has no bounding box`)
  expect(box.width, `${name} width`).toBeGreaterThanOrEqual(MIN_HIT_AREA)
  expect(box.height, `${name} height`).toBeGreaterThanOrEqual(MIN_HIT_AREA)
}

async function expectNoHorizontalOverflow(page: Page, state: string): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement
    const label = (element: Element) => {
      const tag = element.tagName.toLowerCase()
      const classes = typeof element.className === 'string' ? element.className.trim() : ''
      return classes ? `${tag}.${classes.split(/\s+/).join('.')}` : tag
    }

    const offenders = Array.from(document.body.querySelectorAll('*'))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ rect }) => Math.round(rect.right) > root.clientWidth || Math.round(rect.left) < 0)
      .map(
        ({ element, rect }) =>
          `${label(element)} [left=${Math.round(rect.left)}, right=${Math.round(rect.right)}]`,
      )

    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, offenders }
  })

  expect(overflow.offenders, `${state}: elements extending past either viewport edge`).toEqual([])
  expect(overflow.scrollWidth, `${state}: document scroll width`).toBeLessThanOrEqual(
    overflow.clientWidth,
  )
}

test('Tab reaches the add input, then each row control in row order', async ({ page }) => {
  const description = uniqueTodo('keyboard-order')

  await openApp(page)
  // A newly added todo is the newest active one, so it sorts to the top of the
  // shared list and is the first row the tab sequence reaches.
  await addTodo(page, description)

  await addInput(page).focus()
  await expect(addInput(page)).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(addButton(page)).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(rowCheckbox(page, description)).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(editButton(page, description)).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(deleteButton(page, description)).toBeFocused()
})

test('the add form and row controls paint a visible focus ring', async ({ page }) => {
  const description = uniqueTodo('keyboard-focus')

  await openApp(page)
  await addTodo(page, description)

  // Focus is driven by real Tab presses rather than `.focus()` so the controls
  // actually match `:focus-visible`, which is what the focus rings hang off.
  await addInput(page).focus()
  const sequence: [string, Locator][] = [
    ['add input', addInput(page)],
    ['Add button', addButton(page)],
    ['row checkbox', rowCheckbox(page, description)],
    ['row Edit', editButton(page, description)],
    ['row Delete', deleteButton(page, description)],
  ]

  for (const [index, [name, control]] of sequence.entries()) {
    if (index > 0) await page.keyboard.press('Tab')
    await expectVisibleFocusRing(name, control)
  }
})

test('the inline editor Save and Cancel paint a visible focus ring', async ({ page }) => {
  const description = uniqueTodo('keyboard-focus-editor')

  await openApp(page)
  await addTodo(page, description)

  // Opened from the keyboard so the modality that `:focus-visible` keys off is
  // keyboard for everything the editor puts into the tab order.
  await rowCheckbox(page, description).focus()
  await page.keyboard.press('Tab')
  await expect(editButton(page, description)).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(
    page.getByRole('textbox', { name: `Edit description for ${description}` }),
  ).toBeFocused()

  await page.keyboard.press('Tab')
  await expectVisibleFocusRing('editor Save', saveButton(page))
  await page.keyboard.press('Tab')
  await expectVisibleFocusRing('editor Cancel', cancelButton(page))

  await page.keyboard.press('Enter')
  await expect(cancelButton(page)).toHaveCount(0)
})

test('the delete dialog Cancel and Delete paint a visible focus ring', async ({ page }) => {
  const description = uniqueTodo('keyboard-focus-dialog')

  await openApp(page)
  await addTodo(page, description)

  // Chromium only treats a programmatically focused button as `:focus-visible`
  // when the last interaction was a keypress, and the dialog focuses Cancel
  // itself on open — so the dialog has to be opened from the keyboard.
  await rowCheckbox(page, description).focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(deleteButton(page, description)).toBeFocused()
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Delete this todo?' })
  await expect(dialog).toBeVisible()

  await expectVisibleFocusRing('dialog Cancel', dialog.getByRole('button', { name: 'Cancel' }))
  await page.keyboard.press('Tab')
  await expectVisibleFocusRing(
    'dialog Delete',
    dialog.getByRole('button', { name: 'Delete', exact: true }),
  )

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(todoItem(page, description)).toBeVisible()
})

test('the load-failure Retry paints a visible focus ring and meets the hit area', async ({
  page,
}) => {
  try {
    await interceptTodoList(page, (route) => route.abort('failed'))

    await page.goto('/')
    const retry = page.getByRole('alert').getByRole('button', { name: 'Retry' })
    await expect(retry).toBeVisible()

    // The banner owns the only interactive control in this state, so it is the
    // first stop in the tab order.
    await page.keyboard.press('Tab')
    await expectVisibleFocusRing('banner Retry', retry)
    await expectHitArea('banner Retry', retry)
  } finally {
    await page.unroute(TODOS_ROUTE)
  }
})

test('the delete dialog traps Tab, closes on Esc, and returns focus to its trigger', async ({
  page,
}) => {
  const description = uniqueTodo('keyboard-dialog')

  await openApp(page)
  await addTodo(page, description)
  const trigger = deleteButton(page, description)
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Delete this todo?' })
  const cancel = dialog.getByRole('button', { name: 'Cancel' })
  const confirm = dialog.getByRole('button', { name: 'Delete', exact: true })

  await expect(dialog).toBeVisible()
  await expect(cancel).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(confirm).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(cancel).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(confirm).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(todoItem(page, description)).toBeVisible()
})

test('every interactive control clears the 44px minimum hit area', async ({ page }) => {
  const description = uniqueTodo('keyboard-hit-area')

  await openApp(page)
  await addTodo(page, description)

  await expectHitArea('add input', addInput(page))
  await expectHitArea('Add button', addButton(page))
  await expectHitArea('row checkbox target', checkboxTarget(page, description))
  await expectHitArea('row Edit', editButton(page, description))
  await expectHitArea('row Delete', deleteButton(page, description))

  await editButton(page, description).click()
  await expect(
    page.getByRole('textbox', { name: `Edit description for ${description}` }),
  ).toBeVisible()
  await expectHitArea('editor Save', saveButton(page))
  await expectHitArea('editor Cancel', cancelButton(page))
  await cancelButton(page).click()

  await deleteButton(page, description).click()
  const dialog = page.getByRole('dialog', { name: 'Delete this todo?' })
  await expect(dialog).toBeVisible()
  await expectHitArea('dialog Cancel', dialog.getByRole('button', { name: 'Cancel' }))
  await expectHitArea('dialog Delete', dialog.getByRole('button', { name: 'Delete', exact: true }))

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('reflows at 200% zoom with add, edit, and delete still operable', async ({ page }) => {
  const description = uniqueTodo('keyboard-reflow')
  const edited = uniqueTodo('keyboard-reflow-edited')

  await page.setViewportSize(FULL_VIEWPORT)
  await openApp(page)
  await page.setViewportSize(ZOOMED_VIEWPORT)
  await page.addStyleTag({ content: ':root { font-size: 200%; }' })

  await addTodo(page, description)
  await expectNoHorizontalOverflow(page, 'populated list')

  await editButton(page, description).click()
  await expect(
    page.getByRole('textbox', { name: `Edit description for ${description}` }),
  ).toBeVisible()
  await expectNoHorizontalOverflow(page, 'inline editor')
  await cancelButton(page).click()

  await deleteButton(page, description).click()
  const dialog = page.getByRole('dialog', { name: 'Delete this todo?' })
  await expect(dialog).toBeVisible()
  await expectNoHorizontalOverflow(page, 'delete dialog')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)

  await editTodo(page, description, edited)
  await deleteTodo(page, edited)
})
