/* 
 *  logger.ts is a part of Moosync.
 *  
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { rendererLogger } from '../logger';
import { IpcEvents, LoggerEvents } from './constants';

export class LoggerChannel implements IpcChannelInterface {
  name = IpcEvents.LOGGER

  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case LoggerEvents.INFO:
        this.logInfo(event, request)
        break
      case LoggerEvents.ERROR:
        this.logError(event, request)
        break
      case LoggerEvents.WARN:
        this.logWarn(event, request)
        break
      case LoggerEvents.DEBUG:
        this.logDebug(event, request)
        break
      case LoggerEvents.TRACE:
        this.logTrace(event, request)
        break
    }
  }

  private logInfo(event: Electron.IpcMainEvent, request: IpcRequest) {
    rendererLogger.info(...request.params.message)
    event.reply(request.responseChannel)
  }

  private logError(event: Electron.IpcMainEvent, request: IpcRequest) {
    rendererLogger.error(...request.params.message)
    event.reply(request.responseChannel)
  }

  private logDebug(event: Electron.IpcMainEvent, request: IpcRequest) {
    rendererLogger.debug(...request.params.message)
    event.reply(request.responseChannel)
  }

  private logWarn(event: Electron.IpcMainEvent, request: IpcRequest) {
    rendererLogger.warn(...request.params.message)
    event.reply(request.responseChannel)
  }

  private logTrace(event: Electron.IpcMainEvent, request: IpcRequest) {
    rendererLogger.trace(...request.params.message)
    event.reply(request.responseChannel)
  }
}
