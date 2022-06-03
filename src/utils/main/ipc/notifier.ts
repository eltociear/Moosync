/*
 *  notifier.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, NotifierEvents } from './constants'

export class NotifierChannel implements IpcChannelInterface {
  name = IpcEvents.NOTIFIER

  private importTried = false

  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case NotifierEvents.LIBVIPS_INSTALLED:
        this.isLibvipsAvailable(event, request)
        break
    }
  }

  private async isLibvipsAvailable(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (!this.importTried) {
      try {
        await import('sharp')
        event.reply(request.responseChannel, true)
      } catch (e) {
        this.importTried = true
        event.reply(request.responseChannel, false)
        console.debug(e)
      }
    }

    event.reply(request.responseChannel, false)
  }
}
