import { waitForApiHealth } from './compose'

export default async function globalSetup(): Promise<void> {
  await waitForApiHealth()
}
