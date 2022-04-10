/*
 *  this.extensionHost.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { MainHostIPCHandler } from '@/utils/extensions'
import { ExtensionHostEvents, IpcEvents } from './constants'
import { SongDB } from '../db/index'
import { createWriteStream } from 'fs'
import path from 'path'
import { app } from 'electron'
import https from 'https'
import { v1 } from 'uuid'
import { WindowHandler } from '../windowManager'
import { IncomingMessage } from 'http'

export class ExtensionHostChannel implements IpcChannelInterface {
  name = IpcEvents.EXTENSION_HOST

  private extensionHost = new MainHostIPCHandler()
  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case ExtensionHostEvents.INSTALL:
        this.installExt(event, request as IpcRequest<ExtensionHostRequests.Install>)
        break
      case ExtensionHostEvents.GET_ALL_EXTENSIONS:
        this.getAllExtensions(event, request as IpcRequest<ExtensionHostRequests.GetAllExtensions>)
        break
      case ExtensionHostEvents.TOGGLE_EXT_STATUS:
        this.toggleExtensionStatus(event, request as IpcRequest<ExtensionHostRequests.ToggleExtensionStatus>)
        break
      case ExtensionHostEvents.REMOVE_EXT:
        this.removeExtension(event, request as IpcRequest<ExtensionHostRequests.RemoveExtension>)
        break
      case ExtensionHostEvents.GET_EXTENSION_ICON:
        this.getExtensionIcon(event, request as IpcRequest<ExtensionHostRequests.RemoveExtension>)
        break
      case ExtensionHostEvents.SEND_EXTRA_EVENT:
        this.handleMainWindowExtraEvent(event, request as IpcRequest<ExtensionHostRequests.ExtraEvent>)
        break
      case ExtensionHostEvents.DOWNLOAD_EXTENSION:
        this.downloadExtension(event, request as IpcRequest<ExtensionHostRequests.DownloadExtension>)
        break
    }
  }

  private installExt(event: Electron.IpcMainEvent, request: IpcRequest<ExtensionHostRequests.Install>) {
    if (request.params.path) {
      this.extensionHost
        .installExtension(request.params.path)
        .then((result) => event.reply(request.responseChannel, result))
        .catch(console.error)
      return
    }
    event.reply(request.responseChannel, { success: false })
  }

  private getAllExtensions(event: Electron.IpcMainEvent, request: IpcRequest<ExtensionHostRequests.GetAllExtensions>) {
    this.extensionHost.mainRequestGenerator
      .getInstalledExtensions()
      .then((data) => event.reply(request.responseChannel, data))
      .catch(() => {
        event.reply(request.responseChannel)
      })
  }

  private toggleExtensionStatus(
    event: Electron.IpcMainEvent,
    request: IpcRequest<ExtensionHostRequests.ToggleExtensionStatus>
  ) {
    if (request.params.packageName && request.params.enabled !== undefined) {
      this.extensionHost.mainRequestGenerator
        .toggleExtensionStatus(request.params.packageName, request.params.enabled)
        .then(() => event.reply(request.responseChannel))
      return
    }
    event.reply(request.responseChannel)
  }

  private async removeExtension(
    event: Electron.IpcMainEvent,
    request: IpcRequest<ExtensionHostRequests.RemoveExtension>
  ) {
    if (request.params.packageName) {
      await this.extensionHost
        .uninstallExtension(request.params.packageName)
        .then(() => event.reply(request.responseChannel))

      // Remove all song added by this extension
      const songs = SongDB.getSongByOptions({ song: { extension: request.params.packageName } })
      for (const s of songs) {
        await SongDB.removeSong(s._id)
      }
    }
    event.reply(request.responseChannel)
  }

  public closeExtensionHost() {
    return this.extensionHost.closeHost()
  }

  public onMainWindowCreated() {
    this.extensionHost.mainWindowCreated()
  }

  public async getExtensionIcon(
    event: Electron.IpcMainEvent,
    request: IpcRequest<ExtensionHostRequests.RemoveExtension>
  ) {
    if (request.params && request.params.packageName) {
      const data = await this.extensionHost.mainRequestGenerator.getExtensionIcon(request.params.packageName)
      event.reply(request.responseChannel, data)
    }
    event.reply(request.responseChannel)
  }

  public async sendExtraEvent<T extends ExtraExtensionEventTypes>(event: ExtraExtensionEvents<T>) {
    const data = await this.extensionHost.sendExtraEventToExtensions(event)
    return data
  }

  private async handleMainWindowExtraEvent(
    event: Electron.IpcMainEvent,
    request: IpcRequest<ExtensionHostRequests.ExtraEvent>
  ) {
    if (request.params.event) {
      const data = await this.sendExtraEvent(request.params.event)
      event.reply(request.responseChannel, data)
    }
    event.reply(request.responseChannel)
  }

  private followRedirectAndDownload(url: string, callback: (data: IncomingMessage) => void) {
    https.get(url, (res) => {
      if (res.statusCode === 302 && res.headers.location) {
        this.followRedirectAndDownload(res.headers.location, callback)
      } else {
        callback(res)
      }
    })
  }

  private async downloadExtension(
    event: Electron.IpcMainEvent,
    request: IpcRequest<ExtensionHostRequests.DownloadExtension>
  ) {
    if (request.params.ext) {
      const ext = request.params.ext
      const parsedURL = ext.release.url
        .replaceAll('{version}', ext.release.version)
        .replaceAll('{platform}', process.platform)
        .replaceAll('{arch}', process.arch)

      const filePath = path.join(app.getPath('temp'), `${ext.packageName}-${v1()}.msox`)
      const file = createWriteStream(filePath)

      this.notifyPreferenceWindow({ packageName: ext.packageName, status: 'Downloading', progress: 10 })

      try {
        await new Promise<void>((resolve, reject) => {
          this.followRedirectAndDownload(parsedURL, (res) => {
            res.on('error', reject)
            const stream = res.pipe(file)
            stream.on('finish', resolve)
            stream.on('error', reject)
          })
        })
      } catch (e) {
        console.error('Failed to download from', parsedURL, e)
        this.notifyPreferenceWindow({ packageName: ext.packageName, status: 'Failed', error: e, progress: -1 })
        event.reply(request.responseChannel, false)
        return
      }

      console.log(filePath)

      this.notifyPreferenceWindow({ packageName: ext.packageName, status: 'Installing', progress: 50 })

      try {
        await this.extensionHost.installExtension([filePath])
      } catch (e) {
        console.error('Failed to install extension', e)
        this.notifyPreferenceWindow({ packageName: ext.packageName, error: e, status: 'Failed', progress: -1 })
        return
      }

      this.notifyPreferenceWindow({ packageName: ext.packageName, status: 'Installed', progress: 100 })

      event.reply(request.responseChannel, true)
    }
  }

  public notifyPreferenceWindow(data: ExtInstallStatus) {
    WindowHandler.getWindow(false)?.webContents.send(ExtensionHostEvents.EXT_INSTALL_STATUS, data)
  }
}
