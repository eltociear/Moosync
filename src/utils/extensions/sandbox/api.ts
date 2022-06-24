/*
 *  api.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { extensionRequests } from '../constants'
import crypto from 'crypto'

export class ExtensionRequestGenerator implements ExtendedExtensionAPI {
  packageName: string
  player: PlayerControls
  utils: Utils

  // eslint-disable-next-line @typescript-eslint/ban-types
  private eventCallbackMap: { [key: string]: Function } = {}

  private contextMenuMap: ExtendedExtensionContextMenuItems<ContextMenuTypes>[] = []

  private accountsMap: AccountDetails[] = []
  private searchProvider: string | undefined
  private artistSongProvider: string | undefined
  private playlistProvider: string | undefined

  constructor(packageName: string) {
    this.packageName = packageName
    this.player = new PlayerControls(this.packageName)
    this.utils = new Utils(packageName)
  }

  public async getSongs(options: SongAPIOptions) {
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

  public async getSecure<T>(key?: string, defaultValue?: unknown): Promise<T | undefined> {
    return sendAsync<T>(this.packageName, 'get-secure-preferences', {
      packageName: this.packageName,
      key,
      defaultValue
    })
  }

  public async setPreferences(key: string, value: unknown): Promise<void> {
    return sendAsync<void>(this.packageName, 'set-preferences', { packageName: this.packageName, key, value })
  }

  public async setSecure(key: string, value: unknown): Promise<void> {
    return sendAsync<void>(this.packageName, 'set-secure-preferences', { packageName: this.packageName, key, value })
  }

  public async addSongs(...songs: Song[]) {
    return sendAsync<(Song | undefined)[]>(this.packageName, 'add-songs', songs)
  }

  public async removeSong(song_id: string) {
    return sendAsync<void>(this.packageName, 'remove-song', song_id)
  }

  public async addPlaylist(playlist: Omit<Playlist, 'playlist_id'>) {
    return (await sendAsync<string>(this.packageName, 'add-playlist', playlist)) ?? ''
  }

  public async addSongsToPlaylist(playlistID: string, ...songs: Song[]) {
    return sendAsync<void>(this.packageName, 'add-song-to-playlist', { playlistID, songs })
  }

  public async registerOAuth(path: string) {
    return sendAsync<void>(this.packageName, 'register-oauth', path)
  }

  public async openExternalURL(url: string): Promise<void> {
    return sendAsync<void>(this.packageName, 'open-external', url)
  }

  public async showToast(message: string, duration?: number, type?: 'success' | 'info' | 'error' | 'default') {
    return sendAsync<void>(this.packageName, 'show-toast', { type, duration, message })
  }

  public async registerAccount(
    name: string,
    bgColor: string,
    icon: string,
    signinCallback: AccountDetails['signinCallback'],
    signoutCallback: AccountDetails['signoutCallback']
  ): Promise<string> {
    const id = `account:${this.packageName}:${this.accountsMap.length}`
    const final: AccountDetails = {
      id,
      packageName: this.packageName,
      name,
      bgColor,
      icon,
      signinCallback,
      signoutCallback,
      loggedIn: false
    }
    this.accountsMap.push(final)
    await sendAsync<void>(this.packageName, 'register-account', final)
    return id
  }

  public async changeAccountAuthStatus(id: string, loggedIn: boolean, username?: string) {
    const item = this.accountsMap.find((val) => val.id === id)
    if (item) {
      item.username = username
      item.loggedIn = loggedIn
      await sendAsync<void>(this.packageName, 'register-account', item)
    }
  }

  public async openLoginModal(data: LoginModalOptions) {
    return (
      (await sendAsync<boolean>(this.packageName, 'open-login-modal', { packageName: this.packageName, ...data })) ??
      false
    )
  }

  public async closeLoginModal() {
    return await sendAsync<void>(this.packageName, 'close-login-modal')
  }

  // eslint-disable-next-line @typescript-eslint/ban-types
  public on(eventName: string, callback: Function) {
    console.debug('Registering listener for', eventName, 'in package', this.packageName)
    this.eventCallbackMap[eventName] = callback

    if (eventName === 'requestedPlaylists') {
      this.registerPlaylistProvider()
    }
    return callback
  }

  public off<T extends ExtraExtensionEventTypes>(eventName: T) {
    console.debug('Removing listener for', eventName, 'in package', this.packageName)
    delete this.eventCallbackMap[eventName]
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

  private generateExtendedContextMenuItems<T extends ContextMenuTypes>(
    ...items: ExtensionContextMenuItem<T>[]
  ): ExtendedExtensionContextMenuItems<T>[] {
    const ret: ExtendedExtensionContextMenuItems<T>[] = []
    for (const m of items) {
      let children: ExtendedExtensionContextMenuItems<T>[] | undefined = undefined
      if (m.children) {
        children = this.generateExtendedContextMenuItems(...m.children)
      }
      ret.push({
        ...m,
        id: crypto.randomUUID(),
        children,
        packageName: this.packageName
      })
    }

    console.debug('Generated extended type for context menu items')

    return ret
  }

  public setContextMenuItem<T extends ContextMenuTypes>(...items: ExtensionContextMenuItem<T>[]): number {
    console.debug('Adding context menu items for types', items.map((val) => val.type).join(', '))
    return this.contextMenuMap.push(...this.generateExtendedContextMenuItems(...items))
  }

  public removeContextMenuItem(index: number) {
    console.debug('Removing context menu items at', index)
    this.contextMenuMap.splice(index, 1)
  }

  public getContextMenuItems() {
    return this.contextMenuMap
  }

  public _getContextMenuItems(): ExtendedExtensionContextMenuItems<ContextMenuTypes>[] {
    return JSON.parse(JSON.stringify(this.getContextMenuItems()))
  }

  public _getAccountDetails(): AccountDetails[] {
    return this.accountsMap
  }

  public registerSearchProvider(title: string) {
    this.searchProvider = title
  }

  public _getSearchProvider() {
    return this.searchProvider
  }

  public registerArtistSongProvider(title: string) {
    this.artistSongProvider = title
  }

  public _getArtistSongProvider() {
    return this.artistSongProvider
  }

  private registerPlaylistProvider() {
    this.playlistProvider = this.packageName
  }

  public _getPlaylistProvider() {
    return this.playlistProvider
  }

  public setArtistEditableInfo(artist_id: string, object: Record<string, string>) {
    return sendAsync<void>(this.packageName, 'set-artist-editable-info', { artist_id, object })
  }
}

class Utils implements utils {
  private packageName: string

  constructor(packageName: string) {
    this.packageName = packageName
  }

  public getArtistExtraInfo(artist: Artists) {
    if (artist.artist_extra_info?.extensions)
      return artist.artist_extra_info?.extensions[this.packageName] as Record<string, string>
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
  const channel = crypto.randomUUID()
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
