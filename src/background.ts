/*
 *  background.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

'use strict'

import 'threads/register'

import { BrowserWindow, app, nativeTheme, protocol, session } from 'electron'
import { WindowHandler, setIsQuitting, _windowHandler } from './utils/main/windowManager'
import path, { resolve } from 'path'

import { oauthHandler } from '@/utils/main/oauth/handler'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import { getExtensionHostChannel, registerIpcChannels } from '@/utils/main/ipc'
import { setInitialPreferences, loadPreferences, shouldWatchFileChanges } from './utils/main/db/preferences'
import { setupScanTask } from '@/utils/main/scheduler/index'
import { setupDefaultThemes, setupSystemThemes } from './utils/main/themes/preferences'
import { logger } from './utils/main/logger/index'
import { ToadScheduler } from 'toad-scheduler'
import { setupUpdateCheckTask } from './utils/main/scheduler/index'
import pie from 'puppeteer-in-electron'

const isDevelopment = process.env.NODE_ENV !== 'production'

nativeTheme.themeSource = 'dark'

overrideConsole()
_windowHandler.setHardwareAcceleration()
pie.initialize(app)

process.on('uncaughtException', (err) => {
  console.error(err)
})

process.on('unhandledRejection', (err) => {
  console.error(err)
})

if (!app.requestSingleInstanceLock() && !isDevelopment) {
  app.exit()
} else {
  registerProtocols()

  // Quit when all windows are closed.
  app.on('window-all-closed', windowsClosed)
  app.on('activate', activateMac)
  app.addListener('before-quit', beforeQuit)
  app.on('ready', onReady)
  app.on('open-url', openURL)
  app.on('second-instance', handleSecondInstance)
}

function interceptHttp() {
  // Youtube images don't have a CORS header set [Access-Control-Allow-Origin]
  // So to display them and export them, we spoof the request here
  // This should pose any security risk as such since we're only doing it for youtube trusted urls
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    let headers: { [key: string]: string | string[] } = { ...details.responseHeaders }

    if (details.url.startsWith('https://i.ytimg.com')) {
      headers = {
        ...headers,
        'Access-Control-Allow-Origin': '*'
      }
    }

    callback({
      responseHeaders: headers
    })
  })

  // Since youtube embeds are blocked on custom protocols like file:// or app://
  // We'll load the app on http://localhost
  // Which will then be intercepted here and normal files will be delivered
  // Essentially spoofing window.location.origin to become http://localhost
  if (!process.env.WEBPACK_DEV_SERVER_URL) {
    session.defaultSession.protocol.interceptFileProtocol('http', async (request, callback) => {
      let pathName = new URL(request.url).pathname
      pathName = decodeURI(pathName)

      const filePath = path.join(__dirname, pathName)

      // deregister intercept after we handle index.js
      if (request.url.includes('index.html')) {
        session.defaultSession.protocol.uninterceptProtocol('http')
      }

      try {
        callback(filePath)
      } catch (e) {
        logger.error(e)
      }
    })
  }
}

function windowsClosed() {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
}

function activateMac() {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) _windowHandler.createWindow(true)
}
function beforeQuit() {
  setIsQuitting(true)
}

function openURL(event: Electron.Event, data: string) {
  event.preventDefault()
  oauthHandler.handleEvents(data)
}

async function onReady() {
  const { isFirstLaunch } = loadPreferences()
  if (isFirstLaunch) {
    setupDefaultThemes()
  }

  await setupSystemThemes()

  registerIpcChannels()
  setInitialPreferences()

  await _windowHandler.installExtensions()
  _windowHandler.registerProtocol('media')
  createProtocol('moosync')

  interceptHttp()

  await _windowHandler.createWindow(true)

  // Notify extension host of main window creation
  getExtensionHostChannel().onMainWindowCreated()

  _windowHandler.handleFileOpen()

  // Setup scheduler tasks
  const scheduler = new ToadScheduler()
  setupScanTask(scheduler)
  setupUpdateCheckTask(scheduler)
  shouldWatchFileChanges()
}

function registerProtocols() {
  // Scheme must be registered before the app is ready
  protocol.registerSchemesAsPrivileged([{ scheme: 'moosync', privileges: { secure: true, standard: true } }])
  protocol.registerSchemesAsPrivileged([{ scheme: 'media', privileges: { corsEnabled: true, supportFetchAPI: true } }])
}

if (process.platform === 'win32') {
  process.on('message', async (data) => {
    if (data === 'graceful-exit') {
      await _windowHandler.stopAll()
      app.quit()
    }
  })
}

process.on('SIGTERM', async () => {
  await _windowHandler.stopAll()
  app.quit()
})

process.on('SIGINT', async () => {
  await _windowHandler.stopAll()
  app.quit()
})

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    // Set the path of electron.exe and your app.
    // These two additional parameters are only available on windows.
    // Setting this is required to get this working in dev mode.
    app.setAsDefaultProtocolClient('moosync', process.execPath, [resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('moosync')
}

/**
 * Parses process.argv to find if app was started by protocol
 * @param argv array of all arguments passed to process
 * @returns array of string which start with app protocol
 */
function findOAuthArg(argv: string[]) {
  return argv?.find((arg) => arg.startsWith('moosync'))
}

function handleSecondInstance(_: Event, argv: string[]) {
  if (process.platform !== 'darwin') {
    const arg = findOAuthArg(argv)
    if (arg) {
      oauthHandler.handleEvents(arg)
    } else {
      _windowHandler.handleFileOpen(argv)
    }
  }

  if (!isDevelopment) {
    const window = WindowHandler.getWindow()
    if (window && !window.isFocused()) {
      _windowHandler.destroyTray()
      window.show()
    }
  }
}

/**
 * Overrides console with logger
 */
function overrideConsole() {
  console.info = (...args: unknown[]) => {
    logger.info(...args)
  }

  console.error = (...args: unknown[]) => {
    logger.error(...args)
  }

  console.warn = (...args: unknown[]) => {
    logger.warn(...args)
  }

  console.debug = (...args: unknown[]) => {
    logger.debug(...args)
  }

  console.trace = (...args: unknown[]) => {
    logger.trace(...args)
  }
}

export function mainWindowHasMounted() {
  _windowHandler.mainWindowHasMounted()
}
