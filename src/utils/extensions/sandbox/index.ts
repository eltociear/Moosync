/* 
 *  index.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { extensionEventsKeys, mainRequestsKeys } from '@/utils/extensions/constants';

import { ExtensionHandler } from '@/utils/extensions/sandbox/extensionHandler';

class ExtensionHostIPCHandler {
  private extensionHandler: ExtensionHandler
  private mainRequestHandler: MainRequestHandler

  constructor() {
    let extensionPath = ""
    let logsPath = ""
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

    this.extensionHandler = new ExtensionHandler([extensionPath], logsPath)
    this.mainRequestHandler = new MainRequestHandler(this.extensionHandler)

    this.registerListeners()
    this.extensionHandler.startAll()
  }

  private isExtensionEvent(key: string) {
    return extensionEventsKeys.includes(key as any)
  }

  private isMainReply(key: string) {
    return mainRequestsKeys.includes(key as any)
  }

  private registerListeners() {
    process.on('message', (message: extensionHostMessage) => {
      this.parseMessage(message)
    })

    process.on('exit', () => this.extensionHandler.stopAllExtensions())
    process.on('SIGQUIT', () => this.extensionHandler.stopAllExtensions())
    process.on('SIGINT', () => this.extensionHandler.stopAllExtensions())
    process.on('SIGUSR1', () => this.extensionHandler.stopAllExtensions())
    process.on('SIGUSR2', () => this.extensionHandler.stopAllExtensions())
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
    if (message.type === 'find-new-extensions') {
      this.handler.registerPlugins()
        .then(() => this.handler.startAll())
        .then(() => this.sendToMain(message.channel))
      return
    }

    if (message.type === 'get-installed-extensions') {
      this.sendToMain(message.channel, this.handler.getInstalledExtensions())
      return
    }

    if (message.type === 'toggle-extension-status') {
      this.handler.toggleExtStatus(message.data.packageName, message.data.enabled)
        .then(() => {
          this.sendToMain(message.channel)
        })
      return
    }

    if (message.type === 'remove-extension') {
      this.handler.removeExt(message.data.packageName)
        .then(val => this.sendToMain(message.channel, val))
      return
    }
  }

  private sendToMain(channel: string, data?: any) {
    if (process.send) {
      process.send({ channel, data } as mainReplyMessage)
    }
  }
}

const handler = new ExtensionHostIPCHandler()