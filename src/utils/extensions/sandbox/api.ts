/*
 *  api.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { extensionRequests } from '../constants'
import { v4 } from 'uuid'
import { extensionAPI } from '@moosync/moosync-types'

export class ExtensionRequestGenerator implements extensionAPI {
  private packageName: string

  constructor(packageName: string) {
    this.packageName = packageName
  }

  player: PlayerControls = new PlayerControls()

  public async getSongs(options: SongAPIOptions) {
    return sendAsync<Song[]>('get-songs', options)
  }

  public async getCurrentSong() {
    return sendAsync<Song>('get-current-song')
  }

  public async getVolume() {
    return sendAsync<number>('get-volume')
  }

  public async getTime() {
    return sendAsync<number>('get-time')
  }

  public async getQueue() {
    return sendAsync<SongQueue>('get-queue')
  }

  public async getPlayerState() {
    return sendAsync<PlayerState>('get-player-state')
  }

  public async getPreferences(key?: string, defaultValue?: unknown) {
    return sendAsync<SongQueue>('get-preferences', { packageName: this.packageName, key, defaultValue })
  }

  public async setPreferences(key: string, value: unknown) {
    return sendAsync<void>('set-preferences', { packageName: this.packageName, key, value })
  }
}

class PlayerControls implements playerControls {
  play(): Promise<void> {
    return sendAsync<void>('play')
  }

  pause(): Promise<void> {
    return sendAsync<void>('pause')
  }

  stop(): Promise<void> {
    return sendAsync<void>('stop')
  }

  nextSong(): Promise<void> {
    return sendAsync<void>('next')
  }

  prevSong(): Promise<void> {
    return sendAsync<void>('prev')
  }
}

function sendAsync<T>(type: extensionRequests, data?: unknown): Promise<T | undefined> {
  const channel = v4()
  return new Promise((resolve) => {
    if (process.send) {
      let listener: (data: extensionReplyMessage) => void
      process.on(
        'message',
        (listener = function (data: extensionReplyMessage) {
          if (data.channel === channel) {
            process.off('message', listener)
            resolve(data.data)
          }
        })
      )
      process.send({ type, channel, data } as extensionRequestMessage)
      return
    }
    resolve(undefined)
  })
}
