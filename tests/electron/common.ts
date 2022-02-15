import { Page } from 'playwright';

export async function skipSetup(window: Page) {
  await window.click('#skip-setup')
}