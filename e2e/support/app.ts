import { expect, type Locator, type Page, type Route } from '@playwright/test'

export const TODOS_ROUTE = '**/api/todos'

export function uniqueTodo(label: string): string {
  return `e2e ${label} ${crypto.randomUUID()}`
}

// Intercepts only the collection GET. `/api/todos/:id` mutations and every other
// request still reach the real backend, so a routed test stays as close to the
// running stack as the state under test allows.
export async function interceptTodoList(
  page: Page,
  handle: (route: Route) => Promise<void>,
): Promise<void> {
  await page.route(TODOS_ROUTE, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await handle(route)
  })
}

export function addInput(page: Page): Locator {
  return page.getByRole('textbox', { name: 'Add a todo' })
}

export function todoItem(page: Page, description: string, completed = false): Locator {
  return page.getByRole('listitem', {
    name: completed ? `Completed: ${description}` : description,
    exact: true,
  })
}

// Row controls are named after the todo they act on, so each locator is pinned
// with `exact` — a substring match would defeat the point of the per-row names.
export function rowCheckbox(page: Page, description: string, completed = false): Locator {
  return todoItem(page, description, completed).getByRole('checkbox', {
    name: description,
    exact: true,
  })
}

export function editButton(page: Page, description: string, completed = false): Locator {
  return todoItem(page, description, completed).getByRole('button', {
    name: `Edit todo: ${description}`,
    exact: true,
  })
}

export function deleteButton(page: Page, description: string, completed = false): Locator {
  return todoItem(page, description, completed).getByRole('button', {
    name: `Delete todo: ${description}`,
    exact: true,
  })
}

export async function openApp(page: Page): Promise<void> {
  await page.goto('/')
  await expect(addInput(page)).toBeVisible()
}

export async function addTodo(page: Page, description: string): Promise<void> {
  const input = addInput(page)
  await input.fill(description)
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(todoItem(page, description)).toBeVisible()
  await expect(input).toHaveValue('')
}

export async function toggleTodo(
  page: Page,
  description: string,
  completed: boolean,
): Promise<void> {
  await rowCheckbox(page, description, completed).click()
  await expect(todoItem(page, description, !completed)).toBeVisible()
}

export async function editTodo(page: Page, from: string, to: string): Promise<void> {
  await editButton(page, from).click()
  await page.getByRole('textbox', { name: `Edit description for ${from}` }).fill(to)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(todoItem(page, to)).toBeVisible()
}

export async function deleteTodo(page: Page, description: string): Promise<void> {
  await deleteButton(page, description).click()
  const dialog = page.getByRole('dialog', { name: 'Delete this todo?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete' }).click()
  await expect(todoItem(page, description)).toHaveCount(0)
}

export async function expectListOrder(page: Page, names: string[]): Promise<void> {
  await expect
    .poll(async () => {
      const labels = await page
        .getByRole('listitem')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('aria-label') ?? ''),
        )
      const indexes = names.map((name) => labels.indexOf(name))
      if (indexes.some((index) => index < 0)) return labels
      for (let i = 1; i < indexes.length; i += 1) {
        if (indexes[i]! <= indexes[i - 1]!) return labels
      }
      return 'ordered'
    })
    .toBe('ordered')
}
