/*
 *  ContextMenuMixin.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Component } from 'vue-property-decorator'
import { EventBus } from '@/utils/main/ipc/constants'
import { MenuItem } from 'vue-context-menu-popup'
import PlayerControls from '@/utils/ui/mixins/PlayerControls'
import RemoteSong from '@/utils/ui/mixins/remoteSongMixin'
import { bus } from '@/mainWindow/main'
import { mixins } from 'vue-class-component'
import { vxm } from '@/mainWindow/store'

@Component
export default class ContextMenuMixin extends mixins(PlayerControls, RemoteSong) {
  get playlists() {
    return vxm.playlist.playlists
  }

  private async addToPlaylist(playlist_id: string, songs: Song[]) {
    await window.DBUtils.storeSongs(songs.filter((val) => val.type !== 'LOCAL'))
    await window.DBUtils.addToPlaylist(playlist_id, ...songs)
  }

  private getSongSortByMenu(sort: Sort<SongSortOptions>) {
    const menu: MenuItem[] = [
      {
        label: 'Sort by',
        children: [
          {
            label: `Name ${sort.current.type === 'title' ? (sort.current.asc ? '▲' : '▼') : ''}`,
            handler: () => sort.callback({ type: 'title', asc: sort.current.type === 'title' && !sort.current.asc })
          },
          {
            label: `Date added ${sort.current.type === 'date_added' ? (sort.current.asc ? '▲' : '▼') : ''}`,
            handler: () =>
              sort.callback({ type: 'date_added', asc: sort.current.type === 'date_added' && !sort.current.asc })
          }
        ]
      }
    ]
    return menu
  }

  private getPlaylistSortByMenu(sort: Sort<PlaylistSortOptions>) {
    const menu: MenuItem[] = [
      {
        label: 'Sort by',
        children: [
          {
            label: `Name ${sort.current.type === 'name' ? (sort.current.asc ? '▲' : '▼') : ''}`,
            handler: () => sort.callback({ type: 'name', asc: sort.current.type === 'name' && !sort.current.asc })
          },
          {
            label: `Provider ${sort.current.type === 'provider' ? (sort.current.asc ? '▲' : '▼') : ''}`,
            handler: () =>
              sort.callback({ type: 'provider', asc: sort.current.type === 'provider' && !sort.current.asc })
          }
        ]
      }
    ]
    return menu
  }

  private getGenericSortByMenu(sort: Sort<NormalSortOptions>) {
    const menu: MenuItem[] = [
      {
        label: 'Sort by',
        children: [
          {
            label: `Name ${sort.current.type === 'name' ? (sort.current.asc ? '▲' : '▼') : ''}`,
            handler: () => sort.callback({ type: 'name', asc: sort.current.type === 'name' && !sort.current.asc })
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
      }
    ]
    for (const [key, val] of Object.entries(this.playlists)) {
      if (key == exclude) {
        continue
      }
      menu.push({
        label: val,
        handler: () => {
          this.addToPlaylist(key, item)
        }
      })
    }
    return menu
  }

  private getGeneralSongsContextMenu(refreshCallback: () => void, sort?: Sort<SongSortOptions>) {
    const items: MenuItem[] = []

    if (sort) {
      items.push(...this.getSongSortByMenu(sort))
    }

    items.push({
      label: 'Add from URL',
      handler: () => bus.$emit(EventBus.SHOW_SONG_FROM_URL_MODAL, refreshCallback)
    })

    return items
  }

  private getSongContextMenu(
    exclude: string | undefined,
    refreshCallback?: () => void,
    isRemote = false,
    sort?: Sort<SongSortOptions>,
    ...item: Song[]
  ) {
    const items: MenuItem[] = [
      {
        label: 'Play Now',
        handler: () => {
          this.playTop(item)
        }
      },
      {
        label: 'Add To Queue',
        handler: () => {
          this.queueSong(item)
        }
      },
      {
        label: 'Add To Playlist',
        children: this.populatePlaylistMenu(item, exclude)
      }
    ]

    if (sort) {
      items.push(...this.getSongSortByMenu(sort))
    }

    if (!isRemote) {
      items.push(
        ...[
          {
            label: 'Remove from Library',
            handler: async () => {
              try {
                await window.DBUtils.removeSongs(item)
              } catch (e) {
                console.error(e)
              }
              refreshCallback && refreshCallback()
            }
          },
          {
            label: 'Add from URL',
            handler: () => bus.$emit(EventBus.SHOW_SONG_FROM_URL_MODAL, refreshCallback)
          }
        ]
      )
    } else {
      items.push({
        label: 'Add Song to Library',
        handler: () => this.addSongsToLibrary(...item)
      })
    }

    items.push({
      label: 'More Info',
      handler: () => {
        bus.$emit(EventBus.SHOW_SONG_INFO_MODAL, item[0])
      }
    })
    return items
  }

  private getPlaylistContextMenu(playlist: ExtendedPlaylist, callback?: () => void) {
    const items = []
    if (!playlist.isRemote && !playlist.extension) {
      items.push({
        label: 'Remove Playlist',
        handler: () => {
          callback && callback()
        }
      })

      items.push({
        label: 'Export Playlist',
        handler: () => {
          window.DBUtils.exportPlaylist(playlist.playlist_id)
        }
      })

      items.push(this.getEntityInfoMenu(playlist))
    }
    return items
  }

  private getPlaylistContentContextMenu(
    isRemote: boolean,
    sort: Sort<SongSortOptions> | undefined,
    refreshCallback: () => void,
    ...item: Song[]
  ) {
    const items = this.getSongContextMenu(undefined, refreshCallback, isRemote, sort, ...item)
    return items
  }

  private getGeneralPlaylistMenu(sort: Sort<PlaylistSortOptions>, refreshCallback?: () => void) {
    const items = [
      {
        label: 'Add Playlist from URL',
        handler: () => {
          bus.$emit(EventBus.SHOW_PLAYLIST_FROM_URL_MODAL, refreshCallback)
        }
      },
      ...this.getPlaylistSortByMenu(sort)
    ]
    return items
  }

  private getQueueItemMenu(isRemote: boolean, refreshCallback: () => void, item: Song, itemIndex: number) {
    const items = [
      {
        label: 'Play Now',
        handler: () => {
          this.playTop([item])
        }
      },
      {
        label: 'Add To Playlist',
        children: this.populatePlaylistMenu([item], undefined)
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
          this.setSongIndex(itemIndex, -1)
        }
      },
      {
        label: 'Move manually',
        handler: () => {
          bus.$emit(EventBus.SHOW_FORM_MODAL, 'Set index of song', (value: number) => {
            this.setSongIndex(itemIndex, value)
          })
        }
      }
    ]
    if (isRemote) {
      items.push({
        label: 'Add Song to Library',
        handler: () => this.addSongsToLibrary(item)
      })
    } else {
      items.push({
        label: 'Remove from Library',
        handler: async () => {
          try {
            await window.DBUtils.removeSongs([item])
          } catch (e) {
            console.error(e)
          }
          refreshCallback()
        }
      })
    }
    return items
  }

  private getEntityInfoMenu(entity: Album | Artists | Playlist) {
    return {
      label: 'Show Info',
      handler: () => {
        bus.$emit(EventBus.SHOW_ENTITY_INFO_MODAL, entity)
      }
    }
  }

  private getArtistContextMenu(artist: Artists) {
    const items = [this.getEntityInfoMenu(artist)]
    return items
  }

  private getAlbumContextMenu(album: Album) {
    const items = [this.getEntityInfoMenu(album)]
    return items
  }

  public getContextMenu(event: Event, options: ContextMenuArgs) {
    let items: { label: string; handler?: () => void }[] = []
    switch (options.type) {
      case 'SONGS':
        items = this.getSongContextMenu(
          options.args.exclude,
          options.args.refreshCallback,
          options.args.isRemote,
          options.args.sortOptions,
          ...options.args.songs
        )
        break
      case 'GENERAL_SONGS':
        items = this.getGeneralSongsContextMenu(options.args.refreshCallback, options.args.sortOptions)
        break
      case 'PLAYLIST':
        items = this.getPlaylistContextMenu(options.args.playlist, options.args.deleteCallback)
        break
      case 'ALBUM':
        items = this.getAlbumContextMenu(options.args.album)
        break
      case 'ARTIST':
        items = this.getArtistContextMenu(options.args.artist)
        break
      case 'GENERAL_PLAYLIST':
        items = this.getGeneralPlaylistMenu(options.args.sort, options.args.refreshCallback)
        break
      case 'PLAYLIST_CONTENT':
        items = this.getPlaylistContentContextMenu(
          options.args.isRemote,
          options.args.sortOptions,
          options.args.refreshCallback,
          ...options.args.songs
        )
        break
      case 'QUEUE_ITEM':
        items = this.getQueueItemMenu(
          options.args.isRemote,
          options.args.refreshCallback,
          options.args.song,
          options.args.songIndex
        )
        break
      case 'GENERIC_SORT':
        items = this.getGenericSortByMenu(options.args.sortOptions)
        break
    }

    this.getExtensionItems(options.type, this.getExtensionArgs(options)).then((res) => items.push(...res))
    this.emitMenu(event, items)
  }

  private extensionContextMenuItems: ContextMenuTypes[] = [
    'SONGS',
    'ALBUM',
    'ARTIST',
    'GENERAL_PLAYLIST',
    'GENERAL_SONGS',
    'PLAYLIST',
    'PLAYLIST_CONTENT',
    'QUEUE_ITEM'
  ]

  private getExtensionArgs(args: ContextMenuArgs): ExtensionContextMenuHandlerArgs<ContextMenuTypes> {
    switch (args.type) {
      case 'ALBUM':
        return args.args.album
      case 'ARTIST':
        return args.args.artist
      default:
      case 'GENERAL_PLAYLIST':
      case 'GENERAL_SONGS':
        return
      case 'PLAYLIST':
        return args.args.playlist
      case 'PLAYLIST_CONTENT':
        return args.args.songs
      case 'QUEUE_ITEM':
        return args.args.song
      case 'SONGS':
        return args.args.songs
    }
  }

  private async getExtensionItems(
    type: ContextMenuArgs['type'],
    arg: ExtensionContextMenuHandlerArgs<ContextMenuTypes>
  ): Promise<MenuItem[]> {
    if (this.extensionContextMenuItems.includes(type as ContextMenuTypes)) {
      const items = await window.ExtensionUtils.getContextMenuItems(type as ContextMenuTypes)
      for (const i of items) {
        i.handler = () => window.ExtensionUtils.fireContextMenuHandler(i.id, i.packageName, arg)
      }

      return items as MenuItem[]
    }

    return []
  }

  private emitMenu(event: Event, items: { label: string; handler?: () => void }[]) {
    bus.$emit(EventBus.SHOW_CONTEXT, event, items)
  }
}
