/* 
 *  genericProvider.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import localforage from 'localforage'
import { setupCache } from 'axios-cache-adapter'

export const forageStore = localforage.createInstance({
  driver: [
    localforage.INDEXEDDB,
  ],
  name: 'yt-cache'
})

export const cache = setupCache({
  maxAge: 15 * 60 * 1000,
  store: forageStore,
  exclude: { query: false }
})


export abstract class GenericProvider {
  public abstract get loggedIn(): boolean

  /**
   * Login auth handler for provider
   * @returns Promise returned after login event is completed 
   */
  public abstract login(): Promise<any>

  /**
   * Sign out handler for provider
   * @returns Promise returned after sign out event is completed
   */
  public abstract signOut(): Promise<void>

  /**
   * Gets user details from the provider
   * @returns username as string
   */
  public abstract getUserDetails(): Promise<string | undefined>

  /**
   * Get user playlists
   * @returns Array of playlist fetched from users profile
   */
  public abstract getUserPlaylists(): Promise<Playlist[]>

  /**
   * Gets details of single playlist.
   * 
   * @param id id of playlist
   * @param [isUrl] true if id is to be fetched from url. Considered as false by default.
   * @returns Playlist if data is found otherwise undefined
   */
  public abstract getPlaylistDetails(id: string, isUrl?: boolean): Promise<Playlist | undefined>

  /**
   * Gets songs present in playlist
   * @param id 
   * @param [isUrl] 
   * @returns Generator of array {@link Song}
   */
  public abstract getPlaylistContent(id: string, isUrl?: boolean): AsyncGenerator<Song[]>

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
  public abstract getPlaybackUrlAndDuration(song: Song): Promise<{ url: string | undefined, duration: number } | undefined>

  /**
   * Gets details of a song from its url
   * @param url of song
   * @returns {@link Song} details
   */
  public abstract getSongDetails(url: string): Promise<Song | undefined>
}