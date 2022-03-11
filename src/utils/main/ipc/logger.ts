/*
 *  logger.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { rendererLogger } from '../logger'
import { IpcEvents, LoggerEvents } from './constants'

export class LoggerChannel implements IpcChannelInterface {
  name = IpcEvents.LOGGER

  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case LoggerEvents.INFO:
        this.logInfo(event, request as IpcRequest<LoggerRequests.LogEvents>)
        break
      case LoggerEvents.ERROR:
        this.logError(event, request as IpcRequest<LoggerRequests.LogEvents>)
        break
      case LoggerEvents.WARN:
        this.logWarn(event, request as IpcRequest<LoggerRequests.LogEvents>)
        break
      case LoggerEvents.DEBUG:
        this.logDebug(event, request as IpcRequest<LoggerRequests.LogEvents>)
        break
      case LoggerEvents.TRACE:
        this.logTrace(event, request as IpcRequest<LoggerRequests.LogEvents>)
        break
    }
  }

  private logInfo(event: Electron.IpcMainEvent, request: IpcRequest<LoggerRequests.LogEvents>) {
    rendererLogger.info(...request.params.message)
    event.reply(request.responseChannel)
  }

  private logError(event: Electron.IpcMainEvent, request: IpcRequest<LoggerRequests.LogEvents>) {
    rendererLogger.error(...request.params.message)
    event.reply(request.responseChannel)
  }

  private logDebug(event: Electron.IpcMainEvent, request: IpcRequest<LoggerRequests.LogEvents>) {
    rendererLogger.debug(...request.params.message)
    event.reply(request.responseChannel)
  }

  private logWarn(event: Electron.IpcMainEvent, request: IpcRequest<LoggerRequests.LogEvents>) {
    rendererLogger.warn(...request.params.message)
    event.reply(request.responseChannel)
  }

  private logTrace(event: Electron.IpcMainEvent, request: IpcRequest<LoggerRequests.LogEvents>) {
    rendererLogger.trace(...request.params.message)
    event.reply(request.responseChannel)
  }
}
