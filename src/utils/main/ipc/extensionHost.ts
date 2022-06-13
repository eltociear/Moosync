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
import { LogLevelDesc } from 'loglevel'

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
      case ExtensionHostEvents.GET_EXT_CONTEXT_MENU:
        this.getContextMenuItems(event, request as IpcRequest<ExtensionHostRequests.ContextMenuItems>)
        break
      case ExtensionHostEvents.ON_CONTEXT_MENU_ITEM_CLICKED:
        this.fireContextMenuHandler(event, request as IpcRequest<ExtensionHostRequests.ContextMenuHandler>)
        break
      case ExtensionHostEvents.GET_REGISTERED_ACCOUNTS:
        this.getRegisteredAccounts(event, request)
        break
      case ExtensionHostEvents.PERFORM_ACCOUNT_LOGIN:
        this.performAccountLogin(event, request as IpcRequest<ExtensionHostRequests.AccountLogin>)
        break
      case ExtensionHostEvents.GET_REGISTERED_SEARCH_PROVIDERS:
        this.getRegisteredSearchProviders(event, request)
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
        .then(this.notifyExtensionChangedMainWindow)
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

  private async getContextMenuItems(
    event: Electron.IpcMainEvent,
    request: IpcRequest<ExtensionHostRequests.ContextMenuItems>
  ) {
    const data = await this.extensionHost.mainRequestGenerator.getContextMenuItems(request.params.type)
    event.reply(request.responseChannel, data)
  }

  private async fireContextMenuHandler(
    event: Electron.IpcMainEvent,
    request: IpcRequest<ExtensionHostRequests.ContextMenuHandler>
  ) {
    await this.extensionHost.mainRequestGenerator.sendContextMenuItemClicked(
      request.params.id,
      request.params.packageName,
      request.params.arg
    )
    event.reply(request.responseChannel)
  }

  public notifyPreferenceWindow(data: ExtInstallStatus) {
    WindowHandler.getWindow(false)?.webContents.send(ExtensionHostEvents.EXT_INSTALL_STATUS, data)
  }

  public notifyExtensionChangedMainWindow() {
    WindowHandler.getWindow(true)?.webContents.send(ExtensionHostEvents.ON_EXTENSIONS_CHANGED)
  }

  public setLogLevel(level: LogLevelDesc) {
    return this.extensionHost.setExtensionLogLevel(level)
  }

  public async getRegisteredAccounts(event: Electron.IpcMainEvent, request: IpcRequest) {
    const items = await this.extensionHost.mainRequestGenerator.getAccounts()
    event.reply(request.responseChannel, items)
  }

  public async performAccountLogin(
    event: Electron.IpcMainEvent,
    request: IpcRequest<ExtensionHostRequests.AccountLogin>
  ) {
    if (request.params.login !== undefined && request.params.packageName) {
      await this.extensionHost.mainRequestGenerator.performAccountLogin(
        request.params.packageName,
        request.params.accountId,
        request.params.login
      )
      event.reply(request.responseChannel)
    }
  }

  public async getRegisteredSearchProviders(event: Electron.IpcMainEvent, request: IpcRequest) {
    const items = await this.extensionHost.mainRequestGenerator.getSearchProviders()
    event.reply(request.responseChannel, items)
  }
}
