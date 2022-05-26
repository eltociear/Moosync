import { Page } from 'playwright-core'

export async function skipSetup(window: Page) {
  await window.click('#skip-setup')
}
