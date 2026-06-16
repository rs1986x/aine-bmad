import { expect, test } from '@playwright/test'

// Deterministic smoke test proving the Playwright runner + Chromium work.
// It does NOT depend on the real app, network, or time. Real E2E flows
// against the running stack arrive in later stories (Epic 3).
test('playwright + chromium harness renders DOM', async ({ page }) => {
  await page.setContent('<main><h1>harness ok</h1></main>')
  await expect(page.getByRole('heading', { name: 'harness ok' })).toBeVisible()
})
