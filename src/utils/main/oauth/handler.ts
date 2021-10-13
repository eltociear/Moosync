/* 
 *  handler.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { WindowEvents } from "@/utils/main/ipc/constants";
import { WindowHandler } from '../windowManager';
import { v1 } from 'uuid';

type callbackRegistryItem = { path: string } & ({
  isExtension: true
  packageName: string
} | {
  isExtension: false
  channelID: string
})
export class OAuthHandler {
  private callbackRegistry: callbackRegistryItem[] = []

  // TODO: Handle extension events
  public handleEvents(data: string) {
    const url = new URL(data)
    const registered = this.callbackRegistry.find(value => value.path === url.hostname || value.path === url.pathname.replaceAll('/', ''))
    if (registered && !registered.isExtension) {
      WindowHandler.getWindow()?.webContents.send(registered.channelID, data)
    }
    WindowHandler.getWindow()?.focus()
  }

  public registerHandler(path: string) {
    const index = this.callbackRegistry.findIndex(value => value.path === path)
    if (index !== -1) {
      this.callbackRegistry.splice(index, 1)
    }

    const channelID = v1()
    this.callbackRegistry.push({
      isExtension: false,
      channelID,
      path
    })
    return channelID
  }

  public deregisterHandler(path: string) {
    const handler = this.callbackRegistry.findIndex(val => val.path === path)
    if (handler !== -1)
      this.callbackRegistry.splice(handler, 1)
  }
}