/**
 * @jest-environment ./tests/environment/playwrightEnvironment.ts
 */
import { Page, ElectronApplication } from 'playwright-core';
import { skipSetup } from '../common'
import { CustomGlobal } from '../../environment/playwrightEnvironment';

jest.setTimeout(500000)

let electronApp: ElectronApplication

declare const global: CustomGlobal

beforeAll(async () => {
  electronApp = global.electronInstance.app
})

test('a window is created', async () => {
  await electronApp.firstWindow()
  expect(electronApp.windows().length).toBe(1)
})

test('window title', async () => {

  const title = await electronApp.windows()[0].title()
  expect(title).toBe("Moosync")
})

test('open settings', async () => {
  const window = await electronApp.firstWindow()

  await skipSetup(window)

  const windowCreationCallback = jest.fn().mockImplementation((page: Page) => {
    const url = new URL(page.url())
    expect(url.pathname).toBe('/preferenceWindow')
  })

  electronApp.once('window', windowCreationCallback)
  await window.click('#settings')

  await new Promise((r) => setTimeout(r, 1000));

  expect(windowCreationCallback).toHaveBeenCalled()

})