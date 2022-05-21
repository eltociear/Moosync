/*
 *  store.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { loadSelectivePreference, removeSelectivePreference, saveSelectivePreference } from '../db/preferences'

import { IpcEvents } from './constants'
import { StoreEvents } from '@/utils/main/ipc/constants'
import { safeStorage } from 'electron'

export class StoreChannel implements IpcChannelInterface {
  name = IpcEvents.STORE
  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case StoreEvents.SET_SECURE:
        this.setKeytar(event, request as IpcRequest<StoreRequests.Set>)
        break
      case StoreEvents.GET_SECURE:
        this.getKeytar(event, request as IpcRequest<StoreRequests.Get>)
        break
      case StoreEvents.REMOVE_SECURE:
        this.removeKeytar(event, request as IpcRequest<StoreRequests.Get>)
        break
    }
  }

  private async setKeytar(event: Electron.IpcMainEvent, request: IpcRequest<StoreRequests.Set>) {
    if (request.params.service) {
      await this.setSecure(request.params.service, request.params.token)
    }
    event.reply(request.responseChannel)
  }

  public async setSecure(service: string, token: string) {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        if (token) {
          const encrypted = safeStorage.encryptString(token)
          saveSelectivePreference(`secure.${service}`, encrypted.toString('base64'))
        } else {
          removeSelectivePreference(`secure.${service}`)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  private async removeKeytar(event: Electron.IpcMainEvent, request: IpcRequest<StoreRequests.Get>) {
    if (request.params.service) {
      try {
        removeSelectivePreference(`secure.${request.params.service}`)
      } catch (e) {
        console.error(e)
      }
    }
    event.reply(request.responseChannel)
  }

  private async getKeytar(event: Electron.IpcMainEvent, request: IpcRequest<StoreRequests.Get>) {
    if (request.params.service) {
      const data = await this.getSecure(request.params.service)
      event.reply(request.responseChannel, data)
    }
    event.reply(request.responseChannel)
  }

  public async getSecure(service: string) {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = loadSelectivePreference<string>(`secure.${service}`)
        if (encrypted) {
          const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
          return decrypted
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
}
