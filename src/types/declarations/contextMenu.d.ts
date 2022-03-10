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
        sortOptions?: sort
      }
    }
  | {
      type: 'GENERAL_SONGS'
      args: {
        sortOptions?: sort
        refreshCallback: () => void
      }
    }
  | {
      type: 'YOUTUBE'
      args: {
        ytItems: YoutubeItem[]
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
        refreshCallback?: () => void
      }
    }
  | {
      type: 'PLAYLIST_CONTENT'
      args: {
        isRemote: boolean
        refreshCallback: () => void
        sortOptions?: sort
        songs: Song[]
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

type sortOptions = import('@moosync/moosync-types').sortOptions
type sort = { callback: sortCallback; current: sortOptions }
type sortCallback = (options: sortOptions) => void
