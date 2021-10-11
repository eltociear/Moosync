/* 
 *  store.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { loadSelectivePreference, removeSelectivePreference, saveSelectivePreference } from '../db/preferences';

import { IpcEvents } from './constants'
import { StoreEvents } from '@/utils/main/ipc/constants'
import os from 'os'
import { safeStorage } from 'electron'

export class StoreChannel implements IpcChannelInterface {
  name = IpcEvents.STORE
  handle(event: Electron.IpcMainEvent, request: IpcRequest): void {
    switch (request.type) {
      case StoreEvents.SET_SECURE:
        this.setKeytar(event, request)
        break
      case StoreEvents.GET_SECURE:
        this.getKeytar(event, request)
        break
      case StoreEvents.REMOVE_SECURE:
        this.removeKeytar(event, request)
        break
    }
  }

  private async setKeytar(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.token && request.params.service) {
      try {
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = safeStorage.encryptString(request.params.token)
          saveSelectivePreference(`secure.${request.params.service}`, encrypted.toString('base64'))
        }
      } catch (e) {
        console.error(e)
      }
    }
    event.reply(request.responseChannel)
  }

  private async removeKeytar(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.service) {
      try {
        removeSelectivePreference(`secure.${request.params.service}`)
      } catch (e) {
        console.error(e)
      }
    }
    event.reply(request.responseChannel)
  }

  private async getKeytar(event: Electron.IpcMainEvent, request: IpcRequest) {
    if (request.params.service) {
      try {
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = loadSelectivePreference<String>(`secure.${request.params.service}`)
          if (encrypted) {
            const decrypted = safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
            event.reply(request.responseChannel, decrypted)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    event.reply(request.responseChannel)
  }
}
