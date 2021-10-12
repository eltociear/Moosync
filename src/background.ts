/* 
 *  background.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

'use strict'

import 'threads/register';

import { BrowserWindow, app, nativeTheme, protocol, session } from 'electron';
import { WindowHandler, setIsQuitting } from './utils/main/windowManager';
import path, { resolve } from 'path';

import EventEmitter from 'events';
import { OAuthHandler } from '@/utils/main/oauth/handler';
import { autoUpdater } from 'electron-updater';
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib';
import { extensionHost } from '@/utils/extensions';
import fs from 'fs';
import log from 'loglevel'
import pie from 'puppeteer-in-electron';
import { prefixLogger } from './utils/main/logger';
import { registerIpcChannels } from '@/utils/main/ipc'; // Import for side effects
import { setInitialInterfaceSettings } from './utils/main/db/preferences';
import { setupScanTask } from '@/utils/main/scheduler/index';

// Override console.info and console.error with custom logging
overrideConsole()

const isDevelopment = process.env.NODE_ENV !== 'production'

export const oauthHandler = new OAuthHandler()
export const oauthEventEmitter = new EventEmitter()
export const _windowHandler = new WindowHandler()

pie.initialize(app);


nativeTheme.themeSource = 'dark'

// Since in development mode, it is valid to have multiple processes open,
// Quit the app if it is supposed to be launched for oauth
// The argv/s will be passed to the original instance
if (isDevelopment && process.argv.findIndex((arg) => arg.startsWith('moosync')) !== -1) {
  app.quit()
}

if (!app.requestSingleInstanceLock()) {
  if (!isDevelopment)
    app.quit()
}

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([{ scheme: 'moosync', privileges: { secure: true, standard: true } }])
protocol.registerSchemesAsPrivileged([{ scheme: 'media', privileges: { corsEnabled: true, supportFetchAPI: true } }])

function interceptHttp() {
  // Youtube images don't have a CORS header set [Access-Control-Allow-Origin]
  // So to display them and export them, we spoof the request here
  // This should pose any security risk as such since we're only doing it for youtube trusted urls
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    let headers: { [key: string]: string | string[] } = { ...details.responseHeaders }

    if (details.url.startsWith('https://i.ytimg.com')) {
      headers = {
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
        console.error(e)
      }
    })
  }
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) _windowHandler.createWindow(true)
})

app.on('before-quit', () => {
  setIsQuitting(true)
})

autoUpdater.autoInstallOnAppQuit = true
autoUpdater.autoDownload = true

// TODO: Figure out a better way to notify the user about update and wait for confirmation
autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  ((await autoUpdater.checkForUpdatesAndNotify())?.downloadPromise)

  registerIpcChannels()
  setInitialInterfaceSettings()

  await _windowHandler.installExtensions()
  _windowHandler.registerProtocol('media')
  createProtocol('moosync')

  interceptHttp()

  await _windowHandler.createWindow(true)

  // Notify extension host of main window creation
  extensionHost.mainWindowCreated()

  _windowHandler.handleFileOpen()

  // Setup scan scheduler
  setupScanTask()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

app.on('open-url', function (event, data) {
  event.preventDefault()

  // TODO: Test this properly
  oauthHandler.handleEvents(data)
})

if (isDevelopment && process.platform === 'win32') {
  // Set the path of electron.exe and your app.
  // These two additional parameters are only available on windows.
  // Setting this is required to get this working in dev mode.
  app.setAsDefaultProtocolClient('moosync', process.execPath, [
    resolve(process.argv[1])
  ])
} else {
  app.setAsDefaultProtocolClient('moosync')
}

app.on('second-instance', handleSecondInstance)

/**
 * Parses process.argv to find if app was started by protocol
 * @param argv array of all arguments passed to process
 * @returns array of string which start with app protocol
 */
function findOAuthArg(argv: string[]) {
  return argv.find((arg) => arg.startsWith('moosync'))
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
  const child = log.getLogger('Main')
  prefixLogger(app.getPath('logs'), child)
  console.info = (...args: any[]) => {
    child.info(...args)
  }

  console.error = (...args: any[]) => {
    child.error(...args)
  }
}

export function mainWindowHasMounted() {
  _windowHandler.mainWindowHasMounted()
}
