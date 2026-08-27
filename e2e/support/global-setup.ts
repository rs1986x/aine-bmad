import { clearAxeResults } from './a11y'
import { waitForApiHealth } from './compose'

export default async function globalSetup(): Promise<void> {
  await clearAxeResults()
  await waitForApiHealth()
}
