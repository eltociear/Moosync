/*
 *  handler.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { WindowHandler } from '../windowManager'
import { v1 } from 'uuid'
import { getExtensionHostChannel } from '@/utils/main/ipc'

type callbackRegistryItem = { path: string } & (
  | {
      isExtension: true
      packageName: string
    }
  | {
      isExtension: false
      channelID: string
    }
)
export class OAuthHandler {
  private callbackRegistry: {
    [key: string]: callbackRegistryItem[]
  } = {}

  public handleEvents(data: string) {
    const host = new URL(data).host.toLowerCase()
    const registered = this.callbackRegistry[host]
    console.debug('Got OAuth Callback', host, registered)
    if (registered) {
      for (const r of registered) {
        if (!r.isExtension) WindowHandler.getWindow()?.webContents.send(r.channelID, data)
        else
          getExtensionHostChannel().sendExtraEvent({ type: 'oauthCallback', data: [data], packageName: r.packageName })
      }
    }
    WindowHandler.getWindow()?.focus()
  }

  public registerHandler(path: string, isExtension = false, packageName?: string) {
    path = path.toLowerCase()

    if (!this.callbackRegistry[path]) {
      this.callbackRegistry[path] = []
    }

    if (!isExtension) {
      const channelID = v1()
      this.callbackRegistry[path].push({
        isExtension: false,
        channelID,
        path
      })
      return channelID
    } else {
      if (packageName) {
        this.callbackRegistry[path].push({
          isExtension: true,
          packageName: packageName,
          path
        })
      }
    }
  }

  // TODO: Deregister only required callback
  public deregisterHandler(path: string) {
    path = path.toLowerCase()

    this.callbackRegistry[path] = []
  }
}

export const oauthHandler = new OAuthHandler()
