/*
 *  index.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { BrowserWindowChannel } from './window'
import { ExtensionHostChannel } from './extensionHost'
import { IpcEvents } from './constants'
import { LoggerChannel } from './logger'
import { PlaylistsChannel } from './playlists'
import { PreferenceChannel } from './preferences'
import { ScannerChannel } from './scanner'
import { SearchChannel } from './search'
import { SongsChannel } from './songs'
import { StoreChannel } from './store'
import { WindowHandler } from '../windowManager'
import { ipcMain } from 'electron'
import { UpdateChannel } from './update'
import { NotifierChannel } from './notifier'
import { MprisChannel } from './mpris'

let scannerChannel: ScannerChannel | undefined
let updateChannel: UpdateChannel | undefined
let extensionChannel: ExtensionHostChannel | undefined
let preferenceChannel: PreferenceChannel | undefined
let storeChannel: StoreChannel | undefined

export function registerIpcChannels() {
  const ipcChannels = [
    new SongsChannel(),
    getScannerChannel(),
    new PlaylistsChannel(),
    new BrowserWindowChannel(),
    getPreferenceChannel(),
    new SearchChannel(),
    getStoreChannel(),
    new LoggerChannel(),
    getExtensionHostChannel(),
    getUpdateChannel(),
    new NotifierChannel(),
    new MprisChannel()
  ]
  ipcChannels.forEach((channel) => ipcMain.on(channel.name, (event, request) => channel.handle(event, request)))
}

export function getExtensionHostChannel() {
  if (!extensionChannel) {
    extensionChannel = new ExtensionHostChannel()
  }
  return extensionChannel
}

export function getUpdateChannel() {
  if (!updateChannel) {
    updateChannel = new UpdateChannel()
  }
  return updateChannel
}

export function getScannerChannel() {
  if (!scannerChannel) {
    scannerChannel = new ScannerChannel()
  }
  return scannerChannel
}

export function getPreferenceChannel() {
  if (!preferenceChannel) {
    preferenceChannel = new PreferenceChannel()
  }
  return preferenceChannel
}

export function getStoreChannel() {
  if (!storeChannel) {
    storeChannel = new StoreChannel()
  }
  return storeChannel
}

export function notifyRenderer(notif: NotificationObject, mainWindow = true) {
  WindowHandler.getWindow(mainWindow)?.webContents.send(IpcEvents.NOTIFIER, notif)
}
