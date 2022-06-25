/*
 *  extensionHandler.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { AbstractExtensionFinder, ExtensionFinder } from './extensionFinder'
import { AbstractExtensionManager, ExtensionManager } from '@/utils/extensions/sandbox/extensionManager'

import { getVersion } from '@/utils/common'
import { providerFetchRequests } from '../constants'

type CombinedSongsType = SongsReturnType | PlaylistAndSongsReturnType | RecommendationsReturnType

export class ExtensionHandler {
  private extensionManager: AbstractExtensionManager
  private extensionFinder: AbstractExtensionFinder
  private initialized = false
  // eslint-disable-next-line @typescript-eslint/ban-types
  private preInitializedCalls: { func: Function; args?: unknown[] }[]

  constructor(searchPaths: string[], logsPath: string) {
    this.preInitializedCalls = []
    this.extensionManager = new ExtensionManager(logsPath)
    this.extensionFinder = new ExtensionFinder(searchPaths)

    this.registerPlugins().then(() => {
      this.initialized = true
      for (const [index, f] of this.preInitializedCalls.entries()) {
        if (f.args) {
          f.func.bind(this)(...f.args)
        } else f.func.bind(this)()

        this.preInitializedCalls.splice(index)
      }
    })
  }

  private isDuplicateExtension(ext: UnInitializedExtensionItem) {
    const matches = this.extensionManager.getExtensions({ packageName: ext.packageName })
    for (const oldExt of matches) {
      const oldVer = getVersion(oldExt.version)
      const newVer = getVersion(ext.version)
      if (newVer > oldVer) {
        this.extensionManager.deregister(oldExt.packageName)
        return false
      }
      return true
    }
    return false
  }

  public async registerPlugins(): Promise<void> {
    for await (const ext of this.extensionFinder.findExtensions()) {
      if (!this.isDuplicateExtension(ext)) {
        await this.extensionManager.instantiateAndRegister(ext)
      }
    }
  }

  public async startAll() {
    if (this.initialized) {
      await this.toggleExtStatus(undefined, true)
    } else {
      this.preInitializedCalls.push({ func: this.startAll })
    }
  }

  public async toggleExtStatus(packageName: string | undefined, enabled: boolean) {
    const ext = this.extensionManager.getExtensions(packageName ? { packageName } : undefined)
    for (const e of ext) {
      if (enabled) {
        this.sendToExtensions(e.packageName, 'onStarted')
      } else {
        this.sendToExtensions(e.packageName, 'onStopped')
      }
      this.extensionManager.setStarted(e.packageName, enabled)
    }
  }

  public async removeExt(packageName: string) {
    // Shut down extension before removing
    await this.toggleExtStatus(packageName, false)

    this.extensionManager.deregister(packageName)
  }

  public getExtensionIcon(packageName: string) {
    const ext = this.extensionManager.getExtensions({ packageName })
    for (const e of ext) {
      return e.extensionIcon
    }
  }

  public getExtensionAccounts() {
    const ext = this.extensionManager.getExtensions()
    const accountMap: { [key: string]: AccountDetails[] } = {}
    for (const e of ext) {
      accountMap[e.packageName] = e.global.api._getAccountDetails()
    }

    return accountMap
  }

  private getFetchMethod(type: providerFetchRequests): keyof ExtendedExtensionAPI {
    switch (type) {
      case 'get-artist-songs-providers':
        return '_getArtistSongProvider'
      case 'get-album-songs-providers':
        return '_getAlbumSongProvider'
      case 'get-playlist-providers':
        return '_getPlaylistProvider'
      case 'get-search-providers':
        return '_getSearchProvider'
    }
  }

  public getProviderExtensions(type: providerFetchRequests) {
    const method = this.getFetchMethod(type)
    const map: { [key: string]: string } = {}

    if (method) {
      const ext = this.extensionManager.getExtensions()
      for (const e of ext) {
        if (typeof e.global.api[method] === 'function') {
          const provider = (e.global.api[method] as () => string)()
          if (provider) map[e.packageName] = provider
        }
      }
    }
    return map
  }

  public async performExtensionAccountLogin(packageName: string, accountId: string, loginStatus: boolean) {
    const ext = this.extensionManager.getExtensions({ packageName })
    for (const e of ext) {
      const account = e.global.api._getAccountDetails().find((val) => val.id === accountId)
      if (account) {
        loginStatus ? await account.signinCallback() : await account.signoutCallback()
      }
    }
  }

  public sendEvent(event: extensionEventMessage) {
    const method: keyof MoosyncExtensionTemplate = event.type
    if (this.initialized) {
      this.sendToExtensions(event.packageName, method, event.data)
    } else {
      this.preInitializedCalls.push({ func: this.sendEvent, args: [event] })
    }
  }

  private toExtensionDetails(item: ExtensionItem): ExtensionDetails {
    return {
      name: item.name,
      desc: item.desc,
      author: item.author,
      packageName: item.packageName,
      version: item.version,
      hasStarted: item.hasStarted,
      entry: item.entry,
      preferences: item.preferences,
      extensionPath: item.extensionPath,
      extensionIcon: item.extensionIcon
    }
  }

  public getInstalledExtensions() {
    const extensions = this.extensionManager.getExtensions()
    const parsed: ExtensionDetails[] = []
    for (const e of extensions) {
      parsed.push(this.toExtensionDetails(e))
    }
    return parsed
  }

  public async sendToExtensions(
    packageName: string | undefined,
    method: keyof MoosyncExtensionTemplate,
    args?: unknown
  ) {
    for (const ext of this.extensionManager.getExtensions({
      started: method === 'onStarted' ? false : true,
      packageName
    })) {
      try {
        console.debug('Trying to send event:', method, 'to', ext.packageName)
        if (ext.instance[method]) {
          console.debug('Extension can handle event, sending')
          ;(ext.instance[method] as (args: unknown) => Promise<void>)(args)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  public async stopAllExtensions() {
    console.debug('Stopping all extensions')
    this.toggleExtStatus(undefined, false)
  }

  private sanitizeSong(ext: ExtensionItem, ...songs: Song[]): Song[] {
    return songs.map((val) => ({
      ...val,
      artists: this.sanitizeArtists(ext, ...(val.artists ?? [])),
      _id: `${ext.packageName}:${val._id}`,
      providerExtension: ext.packageName
    }))
  }

  private sanitizePlaylist(ext: ExtensionItem, ...playlists: Playlist[]): ExtendedPlaylist[] {
    return playlists.map((val) => ({
      ...val,
      playlist_id: `${ext.packageName}:${val.playlist_id}`,
      extension: ext.packageName
    }))
  }

  private sanitizeAlbums(ext: ExtensionItem, ...albums: Album[]): Album[] {
    return albums.map((val) => ({
      ...val,
      album_id: `${ext.packageName}:${val.album_id}`
    }))
  }

  private sanitizeArtistExtraInfo(extra_info?: Record<string, unknown>) {
    const ret: Record<string, string | undefined> = {}
    if (extra_info) {
      for (const [key, val] of Object.entries(extra_info)) {
        if (typeof val !== 'string') {
          ret[key] = JSON.stringify(val)
        } else {
          ret[key] = val as string
        }
      }
    }

    return ret
  }

  private sanitizeArtists(ext: ExtensionItem, ...artists: Artists[]): Artists[] {
    return artists.map((val) => ({
      ...val,
      artist_id: `${ext.packageName}:${val.artist_id}`,
      artist_extra_info: {
        extensions: {
          [ext.packageName]: this.sanitizeArtistExtraInfo(val.artist_extra_info)
        }
      }
    }))
  }

  public async sendExtraEventToExtensions<T extends ExtraExtensionEventTypes>(event: ExtraExtensionEvents<T>) {
    const allData: { [key: string]: ExtraExtensionEventReturnType<T> | undefined } = {}
    const EventType: T = event.type
    for (const ext of this.extensionManager.getExtensions({ started: true, packageName: event.packageName })) {
      if (event.type === 'requestedPlaylistSongs') {
        event.data[0] = (event.data as ExtraExtensionEventData<'requestedPlaylistSongs'>)[0]?.replace(
          `${ext.packageName}:`,
          ''
        )
      }

      const resp = await ext.global.api._emit<T>({
        type: event.type,
        data: event.data
      })

      if (resp) {
        if (EventType === 'requestedPlaylists') {
          ;(resp as PlaylistReturnType).playlists = this.sanitizePlaylist(
            ext,
            ...(resp as PlaylistReturnType).playlists
          )
        }

        if (EventType === 'requestedPlaylistFromURL') {
          ;(resp as PlaylistAndSongsReturnType).playlist = this.sanitizePlaylist(
            ext,
            (resp as PlaylistAndSongsReturnType).playlist
          )[0]
          ;(resp as PlaylistAndSongsReturnType).songs = this.sanitizeSong(
            ext,
            ...(resp as PlaylistAndSongsReturnType).songs
          )
        }

        if (EventType === 'requestedPlaylistSongs' || EventType === 'requestedRecommendations') {
          ;(resp as CombinedSongsType).songs = this.sanitizeSong(ext, ...(resp as CombinedSongsType).songs)
        }

        if (EventType === 'requestedSongFromURL') {
          ;(resp as SongReturnType).song = this.sanitizeSong(ext, (resp as SongReturnType).song)[0]
        }

        if (EventType === 'requestedSearchResult') {
          ;(resp as SearchReturnType).songs = this.sanitizeSong(ext, ...(resp as SearchReturnType).songs)
          ;(resp as SearchReturnType).playlists = this.sanitizePlaylist(ext, ...(resp as SearchReturnType).playlists)
          ;(resp as SearchReturnType).artists = this.sanitizeArtists(ext, ...(resp as SearchReturnType).artists)
          ;(resp as SearchReturnType).albums = this.sanitizeAlbums(ext, ...(resp as SearchReturnType).albums)
        }

        if (EventType === 'requestedArtistSongs') {
          ;(resp as SongsReturnType).songs = this.sanitizeSong(ext, ...(resp as SongsReturnType).songs)
        }

        if (EventType === 'requestedAlbumSongs') {
          ;(resp as SongsReturnType).songs = this.sanitizeSong(ext, ...(resp as SongsReturnType).songs)
        }
      }

      allData[ext.packageName] = resp
    }

    return allData
  }

  public getExtensionContextMenu<T extends ContextMenuTypes>(type: T): ExtensionContextMenuItem<T>[] {
    const items: ExtensionContextMenuItem<ContextMenuTypes>[] = []
    for (const ext of this.extensionManager.getExtensions({ started: true })) {
      items.push(...ext.global.api._getContextMenuItems().filter((val) => val.type === type))
    }

    return items as ExtensionContextMenuItem<T>[]
  }

  public fireContextMenuCallback(
    id: string,
    packageName: string,
    arg: ExtensionContextMenuHandlerArgs<ContextMenuTypes>
  ) {
    for (const ext of this.extensionManager.getExtensions({ started: true, packageName })) {
      const item = (ext.global.api.getContextMenuItems() as ExtendedExtensionContextMenuItems<ContextMenuTypes>[]).find(
        (val) => val.id === id
      )

      item?.handler && item.handler(arg)
    }
  }
}
