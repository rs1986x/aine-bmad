import { expect, test } from '@playwright/test'

import {
  addInput,
  addTodo,
  deleteTodo,
  editTodo,
  expectListOrder,
  openApp,
  todoItem,
  toggleTodo,
  uniqueTodo,
} from '../support/app'

test.beforeEach(async ({ page }) => {
  await openApp(page)
})

test('creates a todo that persists in the list', async ({ page }) => {
  const description = uniqueTodo('create')

  await addTodo(page, description)

  await expect(todoItem(page, description)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'No todos yet.' })).toHaveCount(0)
})

test('completes and un-completes a todo with active-above-completed re-sort', async ({ page }) => {
  const older = uniqueTodo('older')
  const newer = uniqueTodo('newer')

  await addTodo(page, older)
  await addTodo(page, newer)
  await expectListOrder(page, [newer, older])

  await toggleTodo(page, newer, false)
  await expectListOrder(page, [older, `Completed: ${newer}`])

  await toggleTodo(page, newer, true)
  await expectListOrder(page, [newer, older])
})

test('edits a todo after the save response', async ({ page }) => {
  const original = uniqueTodo('edit-from')
  const updated = uniqueTodo('edit-to')

  await addTodo(page, original)
  await editTodo(page, original, updated)

  await expect(todoItem(page, original)).toHaveCount(0)
  await expect(todoItem(page, updated)).toBeVisible()
})

test('confirmed-deletes a todo after the delete response', async ({ page }) => {
  const description = uniqueTodo('delete')

  await addTodo(page, description)
  await deleteTodo(page, description)

  await expect(todoItem(page, description)).toHaveCount(0)
})

test('keeps a created and edited todo after browser reload', async ({ page }) => {
  const original = uniqueTodo('reload-from')
  const updated = uniqueTodo('reload-to')

  await addTodo(page, original)
  await editTodo(page, original, updated)

  await page.reload()
  await expect(addInput(page)).toBeVisible()
  await expect(todoItem(page, updated)).toBeVisible()
  await expect(todoItem(page, original)).toHaveCount(0)
})

test('keeps a todo created in an earlier browser session', async ({ page, browser }) => {
  const description = uniqueTodo('session')

  await addTodo(page, description)

  // A fresh context shares no cookies or storage with the page above, so seeing
  // the todo proves it came back from the server rather than the client.
  const context = await browser.newContext({ baseURL: test.info().project.use.baseURL })
  try {
    const secondSession = await context.newPage()
    await secondSession.goto('/')
    await expect(addInput(secondSession)).toBeVisible()
    await expect(todoItem(secondSession, description)).toBeVisible()
  } finally {
    await context.close()
  }
})
