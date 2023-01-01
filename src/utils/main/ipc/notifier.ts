/*
 *  notifier.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents } from './constants'

export class NotifierChannel implements IpcChannelInterface {
  name = IpcEvents.NOTIFIER

  private importTried = false

  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    return
  }
}
