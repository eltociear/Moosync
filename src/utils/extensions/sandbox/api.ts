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

export class ExtensionRequestGenerator implements ExtendedExtensionAPI {
  private packageName: string
  player: PlayerControls

  private eventCallbackMap: Partial<{
    [key in ExtraExtensionEventTypes]: (
      ...data: ExtraExtensionEventData<key>
    ) => Promise<ExtraExtensionEventReturnType<key>>
  }> = {}

  constructor(packageName: string) {
    this.packageName = packageName
    this.player = new PlayerControls(this.packageName)
  }

  public async getSongs(options: OriginalSongAPIOptions) {
    return sendAsync<Song[]>(this.packageName, 'get-songs', options)
  }

  public async getCurrentSong() {
    return sendAsync<Song>(this.packageName, 'get-current-song')
  }

  public async getVolume() {
    return sendAsync<number>(this.packageName, 'get-volume')
  }

  public async getTime() {
    return sendAsync<number>(this.packageName, 'get-time')
  }

  public async getQueue() {
    return sendAsync<SongQueue>(this.packageName, 'get-queue')
  }

  public async getPlayerState() {
    return sendAsync<PlayerState>(this.packageName, 'get-player-state')
  }

  public async getPreferences<T>(key?: string, defaultValue?: unknown): Promise<T | undefined> {
    return sendAsync<T>(this.packageName, 'get-preferences', {
      packageName: this.packageName,
      key,
      defaultValue
    })
  }

  public async setPreferences(key: string, value: unknown) {
    return sendAsync<void>(this.packageName, 'set-preferences', { packageName: this.packageName, key, value })
  }

  public async addSongs(...songs: Song[]) {
    return sendAsync<boolean[]>(this.packageName, 'add-songs', songs)
  }

  public async removeSong(song_id: string) {
    return sendAsync<void>(this.packageName, 'remove-song', song_id)
  }

  public async addPlaylist(playlist: Omit<Playlist, 'playlist_id'>) {
    return sendAsync<string>(this.packageName, 'add-playlist', playlist)
  }

  public async addSongsToPlaylist(playlistID: string, ...songs: Song[]) {
    return sendAsync<void>(this.packageName, 'add-song-to-playlist', { playlistID, songs })
  }

  public async registerOAuth(path: string) {
    return sendAsync<void>(this.packageName, 'register-oauth', path)
  }

  public on<T extends ExtraExtensionEventTypes>(
    eventName: T,
    callback: (...args: ExtraExtensionEventData<T>) => Promise<ExtraExtensionEventReturnType<T>>
  ) {
    console.debug('Registering listener for', eventName, 'in package', this.packageName)
    this.eventCallbackMap[eventName] = callback as never
  }

  public async _emit<T extends ExtraExtensionEventTypes>(event: ExtraExtensionEvents<T>) {
    console.debug('emitting', event.type, 'in package', this.packageName)
    const callback = this.eventCallbackMap[event.type] as (
      ...data: ExtraExtensionEventData<T>
    ) => Promise<ExtraExtensionEventReturnType<T>>
    if (callback) {
      return (await callback(...event.data)) as ExtraExtensionEventReturnType<T>
    }
  }
}

class PlayerControls implements playerControls {
  private packageName: string

  constructor(packageName: string) {
    this.packageName = packageName
  }

  play(): Promise<void> {
    return sendAsync<void>(this.packageName, 'play')
  }

  pause(): Promise<void> {
    return sendAsync<void>(this.packageName, 'pause')
  }

  stop(): Promise<void> {
    return sendAsync<void>(this.packageName, 'stop')
  }

  nextSong(): Promise<void> {
    return sendAsync<void>(this.packageName, 'next')
  }

  prevSong(): Promise<void> {
    return sendAsync<void>(this.packageName, 'prev')
  }
}

function sendAsync<T>(packageName: string, type: extensionRequests, data?: unknown): Promise<T | undefined> {
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
      process.send({ type, channel, data, extensionName: packageName } as extensionRequestMessage)
      return
    }
    resolve(undefined)
  })
}
