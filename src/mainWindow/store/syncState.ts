/* 
 *  syncState.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { action, mutation } from 'vuex-class-component';

import { VuexModule } from './module';
import { vxm } from '@/mainWindow/store';

export enum PeerMode {
  WATCHER,
  BROADCASTER,
  UNDEFINED,
}
export class SyncStore extends VuexModule.With({ namespaced: 'sync' }) {
  mode: PeerMode = PeerMode.UNDEFINED
  currentSongDets: Song | null | undefined = null
  currentCover: string = ''
  prefetch: prefetchData[] = []
  currentFetchSong: string = ''
  roomID: string = ''
  isReadyRequested: boolean = false
  queueOrder: string[] = []
  queueIndex: number = 0
  localQueue: Song[] = []

  @mutation
  setMode(mode: PeerMode) {
    this.mode = mode
  }

  @mutation
  setRoom(id: string) {
    this.roomID = id
  }

  @mutation
  setSong(song: Song | null | undefined) {
    this.currentSongDets = song
  }

  @mutation
  addToPrefetch(prefetch: prefetchData) {
    this.prefetch.push(prefetch)
  }

  @mutation
  setPrefetch(prefetch: prefetchData[]) {
    this.prefetch = prefetch
  }

  @mutation
  prioritize(index: number) {
    if (index < this.prefetch.length) {
      const item = this.prefetch[index]
      this.prefetch.splice(index, 1)
      this.prefetch.unshift(item)
    }
  }

  @mutation
  setCover(cover: string) {
    this.currentCover = cover
  }

  @mutation
  setReadyRequested(value: boolean) {
    this.isReadyRequested = value
  }

  @mutation
  setCurrentFetchSong(id: string) {
    this.currentFetchSong = id
  }

  @mutation
  addQueueItem(...value: string[]) {
    this.queueOrder.push(...value)
  }

  @mutation
  setQueueItem(value: string[]) {
    this.queueOrder = value
  }

  @mutation
  setQueueIndex(value: number) {
    if (this.queueIndex < 0) this.queueIndex = this.queueOrder.length - 1
    else this.queueIndex = value
  }

  @action
  async addToLocalQueue(songs: Song[]) {
    for (const song of songs) {
      const ytItem = await vxm.providers.spotifyProvider.spotifyToYoutube(song)
      if (ytItem) {
        song.url = ytItem.youtubeId
        song.duration = ytItem.duration!.totalSeconds
      } else {
        throw new Error('Could not convert song')
      }
      this.localQueue.push(song)
    }
  }
}
