/*
 *  contextMenu.d.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

type ContextMenuArgs =
  | {
      type: 'SONGS'
      args: {
        exclude?: string
        refreshCallback?: () => void
        songs: Song[]
        isRemote?: boolean
      }
    }
  | {
      type: 'GENERAL_SONGS'
      args: {
        sortOptions?: Sort<SongSortOptions>
        refreshCallback?: () => void
      }
    }
  | {
      type: 'PLAYLIST'
      args: {
        playlist: Playlist
        deleteCallback?: () => void
      }
    }
  | {
      type: 'GENERAL_PLAYLIST'
      args: {
        sort: Sort<PlaylistSortOptions>
        refreshCallback?: () => void
      }
    }
  | {
      type: 'QUEUE_ITEM'
      args: {
        isRemote: boolean
        refreshCallback: () => void
        song: Song
        songIndex: number
      }
    }
  | {
      type: 'ENTITY_SORT'
      args: {
        sortOptions: Sort<NormalSortOptions>
      }
    }
  | {
      type: 'ARTIST'
      args: {
        artist: Artists
      }
    }
  | {
      type: 'ALBUM'
      args: {
        album: Album
      }
    }
  | {
      type: 'SONG_SORT'
      args: {
        sortOptions: Sort<SongSortOptions>
      }
    }

type SongSortOptions = { type: 'title' | 'date_added'; asc: boolean }
type PlaylistSortOptions = { type: 'name' | 'provider'; asc: boolean }
type NormalSortOptions = { type: 'name'; asc: boolean }

type Sort<T> = { callback: (options: T) => void; current: T }
