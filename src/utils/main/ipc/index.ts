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

let scannerChannel: ScannerChannel | undefined
let updateChannel: UpdateChannel | undefined
let extensionChannel: ExtensionHostChannel | undefined

export function registerIpcChannels() {
  const ipcChannels = [
    new SongsChannel(),
    getScannerChannel(),
    new PlaylistsChannel(),
    new BrowserWindowChannel(),
    new PreferenceChannel(),
    new SearchChannel(),
    new StoreChannel(),
    new LoggerChannel(),
    getExtensionHostChannel(),
    getUpdateChannel()
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

export function notifyRenderer(notif: NotificationObject) {
  WindowHandler.getWindow(true)?.webContents.send(IpcEvents.NOTIFIER, notif)
}
