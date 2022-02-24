/* 
 *  logger.ts is a part of Moosync.
 *  
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, UpdateEvents } from './constants';
import { WindowHandler } from '../windowManager';
import { autoUpdater } from 'electron-updater';

export class UpdateChannel implements IpcChannelInterface {
  name = IpcEvents.UPDATE

  constructor() {
    autoUpdater.on('checking-for-update', () => console.log('checking for update fired'))
    autoUpdater.on('update-available', () => {
      this.notifyMainWindow(true)
      console.log('notifying availbale')
    })
    autoUpdater.on('update-not-available', () => {
      this.notifyMainWindow(false)
      console.log('notifying not availbale')
    })
  }

  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case UpdateEvents.CHECK_UPDATES:
        this.checkUpdates()
        break
      case UpdateEvents.UPDATE_NOW:
        this.updateNow()
        break
    }
  }

  private notifyMainWindow(available: boolean) {
    WindowHandler.getWindow(true)?.webContents.send(UpdateEvents.GOT_UPDATE, available)
  }

  private async updateNow() {
    await autoUpdater.downloadUpdate()
    autoUpdater.quitAndInstall()
  }

  public async checkUpdates() {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    try {
      // Dont wait for promise to resolve
      await autoUpdater.checkForUpdates()
    } catch (e) {
      console.log(e)
    }
  }
}
