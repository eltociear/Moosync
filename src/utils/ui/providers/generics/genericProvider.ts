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
  maxAge: 15 * 60 * 1000,
  store: forageStore,
  exclude: { query: false },
  invalidate: async (config: Config, request) => {
    if (request.clearCacheEntry) {
      await config.store.removeItem(config.uuid)
    }
  }
})

export abstract class GenericProvider {
  abstract key: string

  abstract loggedIn: boolean

  /**
   * Get user playlists
   * @returns Array of playlist fetched from users profile
   */
  public abstract getUserPlaylists(invalidateCache?: boolean): Promise<Playlist[]>

  /**
   * Gets details of single playlist.
   *
   * @param id id of playlist
   * @returns Playlist if data is found otherwise undefined
   */
  public abstract getPlaylistDetails(id: string, invalidateCache?: boolean): Promise<Playlist | undefined>

  /**
   * Gets songs present in playlist
   * @param id
   * @returns Generator of array {@link Song}
   */
  public abstract getPlaylistContent(id: string, invalidateCache?: boolean): AsyncGenerator<Song[]>

  /**
   * Matches playlist link to verify if current provider is suitable for given link
   * @param str link to match
   * @returns true if playlist can be parsed by current provider
   */
  public abstract matchPlaylist(str: string): boolean

  /**
   * Gets playback url and duration of song from provider. When song conversion to youtube is rate limited then url and duration fetching can be deferred
   * @param song whose url and duration is to be fetched
   * @returns playback url and duration
   */
  public abstract getPlaybackUrlAndDuration(
    song: Song
  ): Promise<{ url: string | undefined; duration: number } | undefined>

  /**
   * Gets details of a song from its url
   * @param url of song
   * @returns {@link Song} details
   */
  public abstract getSongDetails(url: string, invalidateCache?: boolean): Promise<Song | undefined>

  /**
   * Get songs by artist ID
   * @param artist_id ID of artists whose tracks are to be fetched
   */
  public abstract getArtistSongs(artist: Artists): AsyncGenerator<Song[]>

  public abstract searchSongs(term: string): Promise<Song[]>

  public abstract getArtistDetails(artist: Artists, forceFetch?: boolean): Promise<Artists | undefined>

  public abstract searchArtists(term: string): Promise<Artists[]>

  public abstract searchPlaylists(term: string): Promise<Playlist[]>

  public abstract searchAlbum(term: string): Promise<Album[]>
}
