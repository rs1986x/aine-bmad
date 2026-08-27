import { expect, test } from '@playwright/test'

import { addInput, addTodo, openApp, todoItem, uniqueTodo } from '../support/app'
import {
  restoreBackendHealth,
  restartBackend,
  stopBackend,
  waitForApiUnavailable,
} from '../support/compose'

test.describe.configure({ mode: 'serial' })
test.setTimeout(180_000)

test('keeps a persisted todo after backend restart', async ({ page }) => {
  const description = uniqueTodo('restart')

  await openApp(page)
  await addTodo(page, description)

  try {
    await restartBackend()
    await page.reload()
    await expect(addInput(page)).toBeVisible()
    await expect(todoItem(page, description)).toBeVisible()
  } finally {
    await restoreBackendHealth()
  }
})

test('shows an alert and preserves typed create text when the backend is down', async ({
  page,
}) => {
  const description = uniqueTodo('offline')

  await openApp(page)
  const input = addInput(page)
  await input.fill(description)

  try {
    await stopBackend()
    await waitForApiUnavailable()
    await page.getByRole('button', { name: 'Add' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
    await expect(alert).toContainText(/Couldn't (save that change|connect)/)
    await expect(input).toHaveValue(description)
    await expect(todoItem(page, description)).toHaveCount(0)
  } finally {
    await restoreBackendHealth()
  }
})
