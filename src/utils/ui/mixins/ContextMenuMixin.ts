/* 
 *  ContextMenuMixin.ts is a part of Moosync.
 *  
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { Component } from 'vue-property-decorator';
import { EventBus } from '@/utils/main/ipc/constants';
import { MenuItem } from 'vue-context-menu-popup';
import PlayerControls from '@/utils/ui/mixins/PlayerControls';
import RemoteSong from '@/utils/ui/mixins/remoteSongMixin';
import { bus } from '@/mainWindow/main';
import { mixins } from 'vue-class-component';
import { toSong } from '@/utils/models/youtube';
import { vxm } from '@/mainWindow/store';
import ytMusic from 'node-youtube-music';

@Component
export default class ContextMenuMixin extends mixins(PlayerControls, RemoteSong) {
  get playlists() {
    return vxm.playlist.playlists
  }

  private async addToPlaylist(playlist_id: string, songs: Song[]) {
    await window.DBUtils.storeSongs(songs.filter((val) => val.type !== 'LOCAL'))
    await window.DBUtils.addToPlaylist(playlist_id, ...songs)
  }

  private getSortByMenu(sortCallback: sortCallback, currentSort: sortOptions) {
    const menu: MenuItem[] = [
      {
        label: 'Sort by',
        children: [
          {
            label: `Name ${currentSort.type === 'name' ? (currentSort.asc ? '▲' : '▼') : ''}`,
            handler: () => sortCallback({ type: 'name', asc: (currentSort.type === 'name' && !currentSort.asc) })
          },
          {
            label: `Date added ${currentSort.type === 'date' ? (currentSort.asc ? '▲' : '▼') : ''}`,
            handler: () => sortCallback({ type: 'date', asc: (currentSort.type === 'date' && !currentSort.asc) })
          }
        ]
      }
    ]
    return menu
  }

  private populatePlaylistMenu(item: Song[], exclude?: string): MenuItem[] {
    const menu: MenuItem[] = [
      {
        label: 'Create Playlist',
        handler: () => {
          bus.$emit(EventBus.SHOW_NEW_PLAYLIST_MODAL, item)
        }
      },
    ]
    for (const [key, val] of Object.entries(this.playlists)) {
      if (key == exclude) {
        continue
      }
      menu.push({
        label: val,
        handler: () => {
          this.addToPlaylist(key, item)
        },
      })
    }
    return menu
  }

  private getGeneralSongsContextMenu(refreshCallback: () => void, sort?: sort) {
    const items: MenuItem[] = []

    if (sort) {
      items.push(...this.getSortByMenu(sort.callback, sort.current))
    }

    items.push({
      label: 'Add from URL',
      handler: () => bus.$emit(EventBus.SHOW_SONG_FROM_URL_MODAL, refreshCallback)
    })

    return items
  }

  private getSongContextMenu(exclude: string | undefined, refreshCallback?: () => void, isRemote: boolean = false, sort?: sort, ...item: Song[]) {
    const items: MenuItem[] = [
      {
        label: 'Play Now',
        handler: () => {
          this.playTop(item)
        },
      },
      {
        label: 'Add To Queue',
        handler: () => {
          this.queueSong(item)
        },
      },
      {
        label: 'Add To Playlist',
        children: this.populatePlaylistMenu(item, exclude),
      },
    ]

    if (sort) {
      items.push(...this.getSortByMenu(sort.callback, sort.current))
    }

    if (!isRemote) {
      items.push(...[{
        label: 'Remove from Library',
        handler: async () => {
          try {
            await window.DBUtils.removeSongs(item)
          } catch (e) { console.error(e) }
          refreshCallback && refreshCallback()
        }
      }, {
        label: 'Add from URL',
        handler: () => bus.$emit(EventBus.SHOW_SONG_FROM_URL_MODAL, refreshCallback)
      }])
    }

    items.push({
      label: 'More Info',
      handler: () => {
        bus.$emit(EventBus.SHOW_SONG_INFO_MODAL, item[0])
      }
    })
    return items
  }

  private getYoutubeContextMenu(...item: ytMusic.MusicVideo[]) {
    const items = [
      {
        label: 'Play Now',
        handler: () => {
          this.playTop(toSong(...item))
        },
      },
      {
        label: 'Add To Queue',
        handler: () => {
          this.queueSong(toSong(...item))
        },
      },
      {
        label: 'Add To Library',
        handler: () => this.addYTItemsToLibrary(...item),
      },
      {
        label: 'Add To Playlist',
        children: this.populatePlaylistMenu(toSong(...item)),
      },
    ]
    return items
  }

  private getPlaylistContextMenu(playlist: Playlist, callback?: () => void) {
    const items = []
    if (!playlist.isRemote) {
      items.push({
        label: 'Remove Playlist',
        handler: () => {
          callback && callback()
        },
      })
    }
    return items
  }

  private getPlaylistContentContextMenu(isRemote: boolean, sort: sort | undefined, refreshCallback: () => void, ...item: Song[]) {
    const items = this.getSongContextMenu(undefined, refreshCallback, isRemote, sort, ...item)
    if (isRemote) {
      items.push({
        label: 'Add Song to Library',
        handler: () => this.addSongsToLibrary(...item),
      })
    }
    return items
  }

  private getGeneralPlaylistMenu(refreshCallback?: () => void) {
    const items = [
      {
        label: 'Add Playlist from URL',
        handler: () => {
          bus.$emit(EventBus.SHOW_PLAYLIST_FROM_URL_MODAL, refreshCallback)
        },
      }
    ]
    return items
  }

  private getQueueItemMenu(isRemote: boolean, refreshCallback: () => void, item: Song, itemIndex: number) {
    const items = [
      {
        label: 'Play Now',
        handler: () => {
          this.playTop([item])
        },
      },
      {
        label: 'Add To Playlist',
        children: this.populatePlaylistMenu([item], undefined),
      },
      {
        label: 'Move to Top',
        handler: () => {
          this.setSongIndex(itemIndex, 0)
        }
      },
      {
        label: 'Move to Bottom',
        handler: () => {
          this.setSongIndex(itemIndex, vxm.player.queueOrder.length)
        }
      },
      {
        label: 'Move manually',
        handler: () => {
          bus.$emit(EventBus.SHOW_FORM_MODAL, 'Set index of song', (value: number) => {
            console.log(value)
            this.setSongIndex(itemIndex, value)
          })
        }
      },
    ]
    if (isRemote) {
      items.push({
        label: 'Add Song to Library',
        handler: () => this.addSongsToLibrary(item),
      })
    } else {
      items.push({
        label: 'Remove from Library',
        handler: async () => {
          try {
            await window.DBUtils.removeSongs([item])
          } catch (e) { console.error(e) }
          refreshCallback()
        }
      })
    }
    return items
  }

  public getContextMenu(event: Event, options: ContextMenuArgs) {
    let items: { label: string, handler?: () => void }[] = []
    switch (options.type) {
      case 'SONGS':
        items = this.getSongContextMenu(options.args.exclude, options.args.refreshCallback, false, options.args.sortOptions, ...options.args.songs)
        break
      case 'GENERAL_SONGS':
        items = this.getGeneralSongsContextMenu(options.args.refreshCallback, options.args.sortOptions)
        break
      case 'YOUTUBE':
        items = this.getYoutubeContextMenu(...options.args.ytItems)
        break
      case 'PLAYLIST':
        items = this.getPlaylistContextMenu(options.args.playlist, options.args.deleteCallback)
        break
      case 'GENERAL_PLAYLIST':
        items = this.getGeneralPlaylistMenu(options.args.refreshCallback)
        break
      case 'PLAYLIST_CONTENT':
        items = this.getPlaylistContentContextMenu(options.args.isRemote, options.args.sortOptions, options.args.refreshCallback, ...options.args.songs)
        break
      case 'QUEUE_ITEM':
        items = this.getQueueItemMenu(options.args.isRemote, options.args.refreshCallback, options.args.song, options.args.songIndex)
        break
    }
    this.emitMenu(event, items)
  }

  private emitMenu(event: Event, items: { label: string, handler?: () => void }[]) {
    bus.$emit(EventBus.SHOW_CONTEXT, event, items)
  }
}
