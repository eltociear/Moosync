/*
 *  extensionHost.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { ExtensionHostEvents, IpcEvents } from './constants'

import { extensionHost } from '@/utils/extensions/index'

export class ExtensionHostChannel implements IpcChannelInterface {
  name = IpcEvents.EXTENSION_HOST
  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case ExtensionHostEvents.EVENT_TRIGGER:
        this.sendData(event, request as IpcRequest<ExtensionHostRequests.EventTrigger>)
        break
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
    }
  }

  private installExt(event: Electron.IpcMainEvent, request: IpcRequest<ExtensionHostRequests.Install>) {
    if (request.params.path) {
      extensionHost.installExtension(request.params.path).then((result) => event.reply(request.responseChannel, result))
      return
    }
    event.reply(request.responseChannel, { success: false })
  }

  private getAllExtensions(event: Electron.IpcMainEvent, request: IpcRequest<ExtensionHostRequests.GetAllExtensions>) {
    extensionHost.mainRequestGenerator
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
      extensionHost.mainRequestGenerator
        .toggleExtensionStatus(request.params.packageName, request.params.enabled)
        .then(() => event.reply(request.responseChannel))
      return
    }
    event.reply(request.responseChannel)
  }

  private removeExtension(event: Electron.IpcMainEvent, request: IpcRequest<ExtensionHostRequests.RemoveExtension>) {
    if (request.params.packageName) {
      extensionHost.uninstallExtension(request.params.packageName).then(() => event.reply(request.responseChannel))
      return
    }
    event.reply(request.responseChannel)
  }

  private sendData(event: Electron.IpcMainEvent, request: IpcRequest<ExtensionHostRequests.EventTrigger>) {
    if (request.params.data) extensionHost.extensionEventGenerator.send(request.params.data)
    event.reply(request.responseChannel)
  }
}
