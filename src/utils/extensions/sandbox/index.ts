/*
 *  index.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { mainRequestsKeys } from '@/utils/extensions/constants'

import { ExtensionHandler } from '@/utils/extensions/sandbox/extensionHandler'
import { prefixLogger } from '@/utils/main/logger/utils'
import log from 'loglevel'
import { extensionEventsKeys } from '@/utils/extensions/constants'
import { mainRequests } from '../constants'

class ExtensionHostIPCHandler {
  private extensionHandler: ExtensionHandler
  private mainRequestHandler: MainRequestHandler
  private logsPath: string

  constructor() {
    let extensionPath = ''
    let logsPath = ''
    for (const [index, arg] of process.argv.entries()) {
      if (process.argv[index + 1]) {
        if (arg === 'extensionPath') {
          extensionPath = process.argv[index + 1]
        }

        if (arg === 'logPath') {
          logsPath = process.argv[index + 1]
        }
      }
    }

    this.logsPath = logsPath
    this.setupLogger()

    this.extensionHandler = new ExtensionHandler([extensionPath], logsPath)
    this.mainRequestHandler = new MainRequestHandler(this.extensionHandler)

    this.registerListeners()
    this.extensionHandler.startAll()
  }

  private setupLogger() {
    const logger = log.getLogger('Extension Host')
    prefixLogger(this.logsPath, logger)
    const logLevel = process.env.DEBUG_LOGGING ? log.levels.DEBUG : log.levels.INFO
    logger.setLevel(logLevel)

    console.info = (...args: unknown[]) => {
      logger.info(...args)
    }

    console.error = (...args: unknown[]) => {
      logger.error(...args)
    }

    console.warn = (...args: unknown[]) => {
      logger.warn(...args)
    }

    console.debug = (...args: unknown[]) => {
      logger.debug(...args)
    }

    console.trace = (...args: unknown[]) => {
      logger.trace(...args)
    }
  }

  private isExtensionEvent(key: string) {
    return extensionEventsKeys.includes(key as keyof MoosyncExtensionTemplate)
  }

  private isMainReply(key: string) {
    return mainRequestsKeys.includes(key as mainRequests)
  }

  private registerListeners() {
    process.on('message', (message: extensionHostMessage) => {
      this.parseMessage(message as mainRequestMessage)
    })

    process.on('exit', () => this.extensionHandler.stopAllExtensions())
    process.on('SIGQUIT', () => this.extensionHandler.stopAllExtensions())
    process.on('SIGINT', () => this.extensionHandler.stopAllExtensions())
    process.on('SIGUSR1', () => this.extensionHandler.stopAllExtensions())
    process.on('SIGUSR2', () => this.extensionHandler.stopAllExtensions())
    process.on('SIGHUP', () => this.extensionHandler.stopAllExtensions())
    process.on('uncaughtException', (e) => console.error('Asynchronous error caught.', e))
  }

  private parseMessage(message: extensionHostMessage) {
    if (this.isExtensionEvent(message.type)) {
      this.extensionHandler.sendEvent(message as extensionEventMessage)
      return
    }

    if (this.isMainReply(message.type)) {
      this.mainRequestHandler.parseRequest(message as mainRequestMessage)
      return
    }
  }
}

class MainRequestHandler {
  handler: ExtensionHandler

  constructor(handler: ExtensionHandler) {
    this.handler = handler
  }

  public parseRequest(message: mainRequestMessage) {
    console.debug('Received message from main process')
    if (message.type === 'find-new-extensions') {
      this.handler
        .registerPlugins()
        .then(() => this.handler.startAll())
        .then(() => this.sendToMain(message.channel))
      return
    }

    if (message.type === 'get-installed-extensions') {
      this.sendToMain(message.channel, this.handler.getInstalledExtensions())
      return
    }

    if (message.type === 'toggle-extension-status') {
      this.handler.toggleExtStatus(message.data.packageName, message.data.enabled).then(() => {
        this.sendToMain(message.channel)
      })
      return
    }

    if (message.type === 'remove-extension') {
      this.handler.removeExt(message.data.packageName).then((val) => this.sendToMain(message.channel, val))
      return
    }

    if (message.type === 'stop-process') {
      this.handler.stopAllExtensions().then(() => {
        this.sendToMain(message.channel)
      })
      return
    }
  }

  private sendToMain(channel: string, data?: unknown) {
    if (process.send) {
      process.send({ channel, data } as mainReplyMessage)
    }
  }
}

new ExtensionHostIPCHandler()
