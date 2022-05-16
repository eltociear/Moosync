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
import { getLogTail } from '../logger/utils'
import { WindowHandler } from '../windowManager'
import { Tail } from 'tail'
import { setLogLevel } from '../logger/utils'
import { getExtensionHostChannel } from '.'

export class LoggerChannel implements IpcChannelInterface {
  name = IpcEvents.LOGGER
  private tail: Tail | undefined

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
      case LoggerEvents.WATCH_LOGS:
        this.listenLogs(event, request)
        break
      case LoggerEvents.UNWATCH_LOGS:
        this.stopListenLogs(event, request)
        break
      case LoggerEvents.TOGGLE_DEBUG:
        this.setLogLevel(event, request as IpcRequest<LoggerRequests.LogLevels>)
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

  private listenLogs(event: Electron.IpcMainEvent, request: IpcRequest) {
    this.tail = getLogTail()
    let lineIndex = 0
    this.tail.on('line', (data) => {
      WindowHandler.getWindow(false)?.webContents.send(LoggerEvents.WATCH_LOGS, {
        id: lineIndex,
        ...this.parseLogLine(data)
      })
      lineIndex++
    })
    this.tail.watch()
    event.reply(request.responseChannel)
  }

  private stopListenLogs(event: Electron.IpcMainEvent, request: IpcRequest) {
    this.tail?.unwatch()
    this.tail = undefined
    event.reply(request.responseChannel)
  }

  private parseLogLine(line: string) {
    const split = line.split(']')
    if (split.length > 3) {
      const time = split[0]?.substring(1)
      const level = split[1]?.trim().substring(1)
      const process = split[2]?.trim().substring(1)
      const message = split.slice(3).join(']').substring(1).trim()

      return { time, level, process, message }
    } else {
      return { prev: line }
    }
  }

  private setLogLevel(event: Electron.IpcMainEvent, request: IpcRequest<LoggerRequests.LogLevels>) {
    if (request.params.level) {
      setLogLevel(request.params.level)
      getExtensionHostChannel().setLogLevel(request.params.level)
    }
    event.reply(request.responseChannel)
  }
}
