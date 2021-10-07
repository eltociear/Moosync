/* 
 *  logger.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, LoggerEvents } from './constants';

import { app } from 'electron';
import log from 'loglevel'
import { prefixLogger } from '@/utils/main/logger/index';

export class LoggerChannel implements IpcChannelInterface {
  name = IpcEvents.LOGGER
  private customLogger = log.getLogger('Renderer')

  constructor() {
    prefixLogger(app.getPath('logs'), this.customLogger)
  }

  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case LoggerEvents.INFO:
        this.logInfo(event, request)
        break
      case LoggerEvents.ERROR:
        this.logError(event, request)
        break
    }
  }

  private logInfo(event: Electron.IpcMainEvent, request: IpcRequest) {
    this.customLogger.info(request.params.message)
    event.reply(request.responseChannel)
  }

  private logError(event: Electron.IpcMainEvent, request: IpcRequest) {
    this.customLogger.error(request.params.message)
    event.reply(request.responseChannel)
  }
}
