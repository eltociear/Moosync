/*
 *  genericProvider.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import localforage from 'localforage'
import { setupCache } from 'axios-cache-adapter'

type Config = {
  store: {
    removeItem: (uid: string) => Promise<void>
  }
  uuid: string
}

export const forageStore = localforage.createInstance({
  driver: [localforage.INDEXEDDB],
  name: 'yt-cache'
})

export const cache = setupCache({
  maxAge: 604800000, // 7 days
  store: forageStore,
  exclude: { query: false },
  invalidate: async (config: Config, request) => {
    if (request.clearCacheEntry) {
      await config.store.removeItem(config.uuid)
    }
  },
  debug: true
})

export enum ProviderScopes {
  SEARCH,
  PLAYLISTS,
  ARTIST_SONGS,
  ALBUM_SONGS,
  RECOMMENDATIONS,
  SCROBBLES
}

export abstract class GenericProvider {
  constructor() {
    this.updateConfig()
  }

  public abstract getLoggedIn(): Promise<boolean>

  /**
   * Login auth handler for provider
   * @returns Promise returned after login event is completed
   */
  public abstract login(): Promise<boolean>

  /**
   * Sign out handler for provider
   * @returns Promise returned after sign out event is completed
   */
  public abstract signOut(): Promise<void>

  /**
   * Updates config before calling login
   * Method can be used to update config last moment before login
   */
  public abstract updateConfig(): Promise<boolean>

  /**
   * Gets user details from the provider
   * @returns username as string
   */
  public abstract getUserDetails(): Promise<string | undefined>

  abstract key: string

  /**
   * Get user playlists
   * @returns Array of playlist fetched from users profile
   */
  public async getUserPlaylists(invalidateCache?: boolean): Promise<Playlist[]> {
    return []
  }

  /**
   * Gets details of single playlist.
   *
   * @param id id of playlist
   * @returns Playlist if data is found otherwise undefined
   */
  public async getPlaylistDetails(
    id: string,
    invalidateCache?: boolean,
    nextPageToken?: string
  ): Promise<Playlist | undefined> {
    return
  }

  /**
   * Gets songs present in playlist
   * @param id
   * @returns Generator of array {@link Song}
   */
  public async *getPlaylistContent(
    id: string,
    invalidateCache?: boolean
  ): AsyncGenerator<{ songs: Song[]; nextPageToken?: unknown }> {
    yield { songs: [] }
  }

  /**
   * Matches playlist link to verify if current provider is suitable for given link
   * @param str link to match
   * @returns true if playlist can be parsed by current provider
   */
  public matchPlaylist(str: string): boolean {
    return false
  }

  /**
   * Gets playback url and duration of song from provider. When song conversion to youtube is rate limited then url and duration fetching can be deferred
   * @param song whose url and duration is to be fetched
   * @returns playback url and duration
   */
  public async getPlaybackUrlAndDuration(
    song: Song
  ): Promise<{ url: string | undefined; duration: number } | undefined> {
    return
  }

  /**
   * Gets details of a song from its url
   * @param url of song
   * @returns {@link Song} details
   */
  public async getSongDetails(url: string, invalidateCache?: boolean): Promise<Song | undefined> {
    return
  }

  /**
   * Gets recommendations
   * @returns recommendations
   */
  public async *getRecommendations(): AsyncGenerator<Song[]> {
    yield []
  }

  /**
   * Get songs by artist ID
   * @param artist_id ID of artists whose tracks are to be fetched
   */
  public async *getArtistSongs(
    artist: Artists,
    nextPageToken?: unknown
  ): AsyncGenerator<{ songs: Song[]; nextPageToken?: unknown }> {
    yield { songs: [] }
  }

  public async searchSongs(term: string): Promise<Song[]> {
    return []
  }

  public async getArtistDetails(artist: Artists, forceFetch?: boolean): Promise<Artists | undefined> {
    return
  }

  public async searchArtists(term: string): Promise<Artists[]> {
    return []
  }

  public async searchPlaylists(term: string): Promise<Playlist[]> {
    return []
  }

  public async searchAlbum(term: string): Promise<Album[]> {
    return []
  }

  public async scrobble(song: Song): Promise<void> {
    return
  }

  public abstract provides(): ProviderScopes[]
}
