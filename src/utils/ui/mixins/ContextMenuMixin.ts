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
    await window.DBUtils.addToPlaylist(playlist_id, ...songs)
  }

  private getSongSortByMenu(sort: Sort<SongSortOptions>) {
    const menu: MenuItem[] = [
      {
        label: 'Sort by',
        children: [
          {
            label: `${this.$tc('contextMenu.sort.name')} ${
              sort.current.type === 'title' ? (sort.current.asc ? '▲' : '▼') : ''
            }`,
            handler: () => sort.callback({ type: 'title', asc: sort.current.type === 'title' && !sort.current.asc })
          },
          {
            label: `${this.$tc('contextMenu.sort.dateAdded')} ${
              sort.current.type === 'date_added' ? (sort.current.asc ? '▲' : '▼') : ''
            }`,
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
            label: `${this.$tc('contextMenu.sort.name')} ${
              sort.current.type === 'name' ? (sort.current.asc ? '▲' : '▼') : ''
            }`,
            handler: () => sort.callback({ type: 'name', asc: sort.current.type === 'name' && !sort.current.asc })
          },
          {
            label: `${this.$tc('contextMenu.sort.provider')} ${
              sort.current.type === 'provider' ? (sort.current.asc ? '▲' : '▼') : ''
            }`,
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
            label: `${this.$tc('contextMenu.sort.name')} ${
              sort.current.type === 'name' ? (sort.current.asc ? '▲' : '▼') : ''
            }`,
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
        label: this.$tc('contextMenu.playlist.new'),
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

  private getGeneralSongsContextMenu(refreshCallback?: () => void, sort?: Sort<SongSortOptions>) {
    const items: MenuItem[] = []

    if (sort) {
      items.push(...this.getSongSortByMenu(sort))
    }

    if (refreshCallback) {
      items.push({
        label: this.$tc('contextMenu.song.addFromURL'),
        handler: () => bus.$emit(EventBus.SHOW_SONG_FROM_URL_MODAL, refreshCallback)
      })
    }

    return items
  }

  private getSongContextMenu(
    exclude: string | undefined,
    refreshCallback?: () => void,
    isRemote = false,
    ...item: Song[]
  ) {
    const items: MenuItem[] = [
      {
        label: this.$tc('contextMenu.song.playNow'),
        handler: () => {
          this.playTop(item)
        }
      },
      {
        label: this.$tc('contextMenu.song.addToQueue'),
        handler: () => {
          this.queueSong(item)
        }
      },
      {
        label: this.$tc('contextMenu.playlist.add'),
        children: this.populatePlaylistMenu(item, exclude)
      }
    ]

    if (!isRemote) {
      items.push(
        ...[
          {
            label: this.$tc('contextMenu.song.remove'),
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
            label: this.$tc('contextMenu.song.addFromURL'),
            handler: () => bus.$emit(EventBus.SHOW_SONG_FROM_URL_MODAL, refreshCallback)
          }
        ]
      )
    } else {
      items.push({
        label: this.$tc('contextMenu.song.add', item.length),
        handler: () => this.addSongsToLibrary(...item)
      })
    }

    items.push({
      label: this.$tc('contextMenu.moreInfo'),
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
        label: this.$tc('contextMenu.playlist.remove'),
        handler: () => {
          callback && callback()
        }
      })

      items.push({
        label: this.$tc('contextMenu.playlist.export'),
        handler: () => {
          window.DBUtils.exportPlaylist(playlist.playlist_id)
        }
      })

      items.push(this.getEntityInfoMenu(playlist))
    }
    return items
  }

  private getGeneralPlaylistMenu(sort: Sort<PlaylistSortOptions>, refreshCallback?: () => void) {
    const items = [
      {
        label: this.$tc('contextMenu.playlist.addFromURL'),
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
        label: this.$tc('contextMenu.song.playNow'),
        handler: () => {
          this.playTop([item])
        }
      },
      {
        label: this.$tc('contextMenu.playlist.add'),
        children: this.populatePlaylistMenu([item], undefined)
      },
      {
        label: this.$tc('contextMenu.song.moveToTop'),
        handler: () => {
          this.setSongIndex(itemIndex, 0)
        }
      },
      {
        label: this.$tc('contextMenu.song.moveToBottom'),
        handler: () => {
          this.setSongIndex(itemIndex, -1)
        }
      },
      {
        label: this.$tc('contextMenu.song.moveManually'),
        handler: () => {
          bus.$emit(EventBus.SHOW_FORM_MODAL, this.$tc('contextMenu.song.manualIndex'), (value: number) => {
            this.setSongIndex(itemIndex, value)
          })
        }
      }
    ]

    items.push({
      label: this.$tc('contextMenu.moreInfo'),
      handler: () => {
        bus.$emit(EventBus.SHOW_SONG_INFO_MODAL, item)
      }
    })

    if (isRemote) {
      items.push({
        label: this.$tc('contextMenu.song.add'),
        handler: () => this.addSongsToLibrary(item)
      })
    } else {
      items.push({
        label: this.$tc('contextMenu.song.remove'),
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
      label: this.$tc('contextMenu.moreInfo'),
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
        console.log(options.args.isRemote)
        items = this.getSongContextMenu(
          options.args.exclude,
          options.args.refreshCallback,
          options.args.isRemote,
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
      case 'QUEUE_ITEM':
        items = this.getQueueItemMenu(
          options.args.isRemote,
          options.args.refreshCallback,
          options.args.song,
          options.args.songIndex
        )
        break
      case 'ENTITY_SORT':
        items = this.getGenericSortByMenu(options.args.sortOptions)
        break
      case 'SONG_SORT':
        items = this.getSongSortByMenu(options.args.sortOptions)[0].children ?? []
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
