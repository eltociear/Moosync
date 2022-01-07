/* 
 *  window.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, WindowEvents } from './constants';

import { WindowHandler, _windowHandler } from '../windowManager';
import { mainWindowHasMounted } from '../../../background';
import { app, shell } from 'electron';
import path from 'path';
import { downloadFile } from '@/utils/common';
import { oauthHandler } from '../oauth/handler';

export class BrowserWindowChannel implements IpcChannelInterface {
  name = IpcEvents.BROWSER_WINDOWS

  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case WindowEvents.OPEN_WIN:
        this.openWindow(event, request)
        break
      case WindowEvents.CLOSE_WIN:
        this.closeWindow(event, request)
        break
      case WindowEvents.MIN_WIN:
        this.minWindow(event, request)
        break
      case WindowEvents.MAX_WIN:
        this.maxWindow(event, request)
        break
      case WindowEvents.TOGGLE_DEV_TOOLS:
        this.toggleDevTools(event, request)
        break
      case WindowEvents.OPEN_FILE_BROWSER:
        this.openFileBrowser(event, request)
        break
      case WindowEvents.OPEN_URL_EXTERNAL:
        this.openUrl(event, request)
        break
      case WindowEvents.MAIN_WINDOW_HAS_MOUNTED:
        this.mainWindowMounted(event, request)
        break
      case WindowEvents.IS_MAXIMIZED:
        this.isMaximized(event, request)
        break
      case WindowEvents.REGISTER_OAUTH_CALLBACK:
        this.registerOauth(event, request)
        break
      case WindowEvents.DEREGISTER_OAUTH_CALLBACK:
        this.deregisterOauth(event, request)
        break
      case WindowEvents.DRAG_FILE:
        console.log('here')
        this.dragFile(event, request)
        break
    }
  }

  private async openWindow(event: Electron.IpcMainEvent, request: IpcRequest) {
    _windowHandler.createWindow(!!request.params.isMainWindow, request.params.args)
    event.reply(request.responseChannel, null)
  }

  private closeWindow(event: Electron.IpcMainEvent, request: IpcRequest) {
    _windowHandler.closeWindow(!!request.params.isMainWindow)
    event.reply(request.responseChannel, null)
  }

  private maxWindow(event: Electron.IpcMainEvent, request: IpcRequest) {
    const ret = _windowHandler.maximizeWindow(!!request.params.isMainWindow)
    event.reply(request.responseChannel, ret)
  }

  private minWindow(event: Electron.IpcMainEvent, request: IpcRequest) {
    _windowHandler.minimizeWindow(!!request.params.isMainWindow)
    event.reply(request.responseChannel)
  }

  private toggleDevTools(event: Electron.IpcMainEvent, request: IpcRequest) {
    _windowHandler.toggleDevTools(!!request.params.isMainWindow)
    event.reply(request.responseChannel, null)
  }

  private openFileBrowser(event: Electron.IpcMainEvent, request: IpcRequest) {
    _windowHandler.openFileBrowser(request.params.isMainWindow, {
      properties: [request.params.file ? 'openFile' : 'openDirectory'],
      filters: request.params.filters
    }).then((data) => event.reply(request.responseChannel, data))
  }

  private openUrl(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.url) {
      shell.openExternal(request.params.url).then(() => event.reply(request.responseChannel))
      return
    }
    event.reply(request.responseChannel)
  }

  private mainWindowMounted(event: Electron.IpcMainEvent, request: IpcRequest) {
    mainWindowHasMounted()
    event.reply(request.responseChannel)
  }

  private isMaximized(event: Electron.IpcMainEvent, request: IpcRequest) {
    const window = WindowHandler.getWindow(request.params.isMainWindow)
    event.reply(request.responseChannel, window?.isMaximized())
  }

  private registerOauth(event: Electron.IpcMainEvent, request: IpcRequest) {
    let channelID
    if (request.params.path) {
      channelID = oauthHandler.registerHandler(request.params.path)
    }
    event.reply(request.responseChannel, channelID)
  }

  private deregisterOauth(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.path) {
      oauthHandler.deregisterHandler(request.params.path)
    }
    event.reply(request.responseChannel)
  }

  private async dragFile(event: Electron.IpcMainEvent, request: IpcRequest) {
    let filePath: string = request.params.path
    if (filePath) {
      if (filePath.startsWith('http')) {
        let destPath = path.join(app.getPath('temp'), path.basename(filePath))
        if (!path.extname(destPath)) {
          destPath += ".jpg"
        }

        await downloadFile(filePath, destPath)
        filePath = destPath
      }

      if (filePath.startsWith('media')) {
        filePath = filePath.replace('media://', '')
      }

      console.log(filePath)

      event.sender.startDrag({
        file: filePath,
        icon: path.join(__static, 'logo.png')
      })
    }
    event.reply(request.responseChannel)
  }
}
