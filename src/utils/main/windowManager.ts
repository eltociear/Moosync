/* 
 *  windowManager.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { BrowserWindow, Menu, Tray, app, dialog, protocol } from 'electron';
import { SongEvents, WindowEvents } from './ipc/constants';
import { getWindowSize, setWindowSize } from './db/preferences';
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer';

import { BrowserWindowConstructorOptions } from 'electron/main';
import path from 'path';

export class WindowHandler {
  private static mainWindow: number
  private static preferenceWindow: number

  private trayHandler = new TrayHandler()
  private isDevelopment = process.env.NODE_ENV !== 'production'
  private _isMainWindowMounted = true
  private pathQueue: string[] = []

  public static getWindow(mainWindow: boolean = true) {
    if (mainWindow && this.mainWindow !== undefined)
      return BrowserWindow.fromId(this.mainWindow)

    if (!mainWindow && this.preferenceWindow !== undefined) {
      return BrowserWindow.fromId(this.preferenceWindow)
    }
  }

  private get baseWindowProps(): BrowserWindowConstructorOptions {
    return {
      backgroundColor: '#212121',
      titleBarStyle: 'hidden',
      frame: false,
      show: true,
      icon: path.join(__static, 'logo.png'),
      webPreferences: {
        contextIsolation: true,
        // Use pluginOptions.nodeIntegration, leave this alone
        // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
        nodeIntegration: (process.env.ELECTRON_NODE_INTEGRATION as unknown) as boolean,
        preload: path.join(__dirname, 'preload.js'),
      },
    }
  }

  private get mainWindowProps(): BrowserWindowConstructorOptions {
    return {
      title: 'Moosync',
      ...getWindowSize('mainWindow', { width: 1016, height: 653 }),
      minHeight: 653,
      minWidth: 1016,
      ...this.baseWindowProps
    }
  }

  private get prefWindowProps(): BrowserWindowConstructorOptions {
    return {
      title: 'Preferences',
      ...getWindowSize('prefWindow', { width: 840, height: 653 }),
      minHeight: 653,
      minWidth: 840,
      ...this.baseWindowProps
    }
  }

  public async installExtensions() {
    if (this.isDevelopment && !process.env.IS_TEST) {
      // Install Vue Devtools
      try {
        await installExtension(VUEJS_DEVTOOLS)
      } catch (e) {
        console.error('Vue Devtools failed to install:', e)
      }
    }
  }

  public registerProtocol(protocolName: string) {
    protocol.registerFileProtocol(protocolName, (request, callback) => {
      const url = request.url.replace(`${protocolName}://`, '')
      try {
        return callback(decodeURIComponent(url))
      } catch (error) {
        console.error(error)
        app.quit()
      }
    })
  }

  public handleFileOpen(argv: string[] = process.argv) {
    const parsedArgv = argv.filter(val => !val.startsWith('-') && !val.startsWith('--')).slice((this.isDevelopment) ? 2 : 1)
    if (this._isMainWindowMounted) {
      this.sendToMainWindow(SongEvents.GOT_FILE_PATH, parsedArgv)
    } else {
      this.pathQueue.push(...parsedArgv)
    }
  }

  public mainWindowHasMounted() {
    this._isMainWindowMounted = true
    this.sendToMainWindow(SongEvents.GOT_FILE_PATH, this.pathQueue)
  }

  private getWindowURL(isMainWindow: boolean) {
    let url = ''

    if (process.env.WEBPACK_DEV_SERVER_URL)
      url = process.env.WEBPACK_DEV_SERVER_URL + ((isMainWindow) ? '' : 'preferenceWindow')
    else
      url = isMainWindow ? 'http://localhost/./index.html' : 'moosync://./preferenceWindow.html'

    return url
  }

  public destroyTray() {
    this.trayHandler.destroy()
  }

  public sendToMainWindow(channel: string, arg: any) {
    WindowHandler.getWindow() && WindowHandler.getWindow()!.webContents.send(channel, arg)
  }

  public async createWindow(isMainWindow: boolean = true, args?: any) {
    let win: BrowserWindow
    if (!WindowHandler.getWindow(isMainWindow) || WindowHandler.getWindow(isMainWindow)?.isDestroyed()) {
      win = new BrowserWindow(isMainWindow ? this.mainWindowProps : this.prefWindowProps)

      await win.loadURL(this.getWindowURL(isMainWindow))

      win.removeMenu()

      if (this.isDevelopment) win.webContents.openDevTools()

      if (isMainWindow)
        WindowHandler.mainWindow = win.id
      else
        WindowHandler.preferenceWindow = win.id

      this.attachWindowEvents(win, isMainWindow)
    } else {
      console.info('Window already exists, focusing')
      win = WindowHandler.getWindow(isMainWindow)!
      win.focus()
    }

    win.webContents.send(WindowEvents.GOT_EXTRA_ARGS, args)
  }

  private handleWindowClose(event: Event, window: BrowserWindow, isMainWindow: boolean) {
    if (window.webContents.isDevToolsOpened()) {
      window.webContents.closeDevTools()
    }

    const [width, height] = window.getSize()
    setWindowSize(isMainWindow ? 'mainWindow' : 'prefWindow', { width, height })

    if (isMainWindow) {
      event.preventDefault()
      if (!AppExitHandler._isQuitting && AppExitHandler._minimizeToTray) {
        this.trayHandler.createTray()
        window.hide()
      } else {
        app.exit()
      }
    }
  }

  public createScrapeWindow() {
    return new BrowserWindow({
      show: false
    })
  }

  private handleWindowShow(window: BrowserWindow) {
    window.focus()
  }

  private attachWindowEvents(window: BrowserWindow, isMainWindow: boolean) {
    window.on('close', (event) => {
      this.handleWindowClose(event, window, isMainWindow)
    })

    window.on('show', () => {
      this.handleWindowShow(window)
    })
  }

  public minimizeWindow(isMainWindow: boolean = true) {
    const window = WindowHandler.getWindow(isMainWindow)
    window?.minimizable && window.minimize()
  }

  public maximizeWindow(isMainWindow: boolean = true) {
    const window = WindowHandler.getWindow(isMainWindow)
    if (window?.maximizable) {
      if (window.isMaximized()) window.restore()
      else window.maximize()

      return window?.isMaximized()
    }

    return false
  }

  public toggleDevTools(isMainWindow: boolean = true) {
    const window = WindowHandler.getWindow(isMainWindow)
    window?.webContents.isDevToolsOpened() ? window.webContents.closeDevTools() : window?.webContents.openDevTools()
  }

  public async openFileBrowser(isMainWindow: boolean = true, options: Electron.OpenDialogOptions) {
    const window = WindowHandler.getWindow(isMainWindow)
    return window && dialog
      .showOpenDialog(window, options)
  }

  public closeWindow(isMainWindow: boolean = true) {
    const window = WindowHandler.getWindow(isMainWindow)
    window && !window?.isDestroyed() && window.close()
  }
}

class AppExitHandler {
  public static _isQuitting = false
  public static _minimizeToTray = true
}

class TrayHandler {
  private _tray: Tray | null = null

  public createTray() {
    if (!this._tray || this._tray?.isDestroyed())
      this._tray = new Tray(path.join(__static, 'logo.png'))
    this.setupListeners()
    this.setupContextMenu()
  }

  private setupContextMenu() {
    if (this._tray && !this._tray.isDestroyed()) {
      this._tray.setContextMenu(
        Menu.buildFromTemplate([
          {
            label: 'Show App',
            click: () => {
              this.destroy()
              AppExitHandler._isQuitting = false
              WindowHandler.getWindow()?.show()
            },
          },
          {
            label: 'Quit',
            click: function () {
              AppExitHandler._isQuitting = true
              app.quit()
            },
          },
        ])
      )
    }
  }

  private setupListeners() {
    if (this._tray) {
      this._tray.on('double-click', () => {
        WindowHandler.getWindow()?.show()
        this.destroy()
      })
    }
  }

  public destroy() {
    this._tray && !this._tray.isDestroyed() && this._tray.destroy()
    this._tray = null
  }
}

export function setMinimizeToTray(enabled: boolean) {
  AppExitHandler._minimizeToTray = enabled
}

export function setIsQuitting(val: boolean) {
  AppExitHandler._isQuitting = val
}