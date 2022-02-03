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
import { v1 } from 'uuid';
import { toRemoteSong } from '@/utils/common';

export enum PeerMode {
  WATCHER,
  BROADCASTER,
  UNDEFINED,
}

class Queue implements GenericQueue<RemoteSong> {
  data: QueueData<RemoteSong> = {}
  order: QueueOrder = []
  index: number = -1
}

export class SyncStore extends VuexModule.With({ namespaced: 'sync' }) {
  mode: PeerMode = PeerMode.UNDEFINED
  currentSong: RemoteSong | null | undefined = null
  currentCover: string = ''
  currentFetchSong: string = ''
  roomID: string = ''
  isReadyRequested: boolean = false
  _socketID: string = ''

  private songQueue = new Queue()

  get socketID() {
    return this._socketID
  }

  set socketID(id: string) {
    this._socketID = id
  }

  get queueOrder() {
    return this.songQueue.order
  }

  set queueOrder(order: QueueOrder) {
    this.songQueue.order = order
  }

  get queueIndex() {
    return this.songQueue.index
  }

  set queueIndex(value: number) {
    this.songQueue.index = value
  }

  get queueData() {
    return this.songQueue.data
  }

  set queueData(data: QueueData<RemoteSong>) {
    this.songQueue.data = data
  }

  @mutation
  private _setSongQueueOrder(order: QueueOrder) {
    this.songQueue.order = order
  }

  @mutation
  private clearCurrentSong() {
    this.currentSong = null
  }

  @action
  async setQueueOrder(order: QueueOrder) {
    if (order.length === 0) {
      this.clearCurrentSong()
    }

    const oldOrder = this.songQueue.order
    this._setSongQueueOrder(order)

    const diff = oldOrder.filter(x => !order.includes(x));
    for (const item of diff) {
      this.removeFromQueueData(item)
    }
  }

  get queueTop(): RemoteSong | null | undefined {
    if (this.songQueue.index > -1 && this.songQueue.data) {
      const songID = this.songQueue.order[this.songQueue.index]
      if (songID)
        return this.songQueue.data[songID.songID]
    }
    return null
  }

  @mutation
  private addSong(item: Song[]) {
    for (const s of item) {
      const song = toRemoteSong(s, this.socketID)
      if (song && !this.songQueue.data[song._id!]) {
        this.songQueue.data[song._id!] = song
      }
    }
  }

  @mutation
  private removeFromQueueData(orderData: QueueOrder[0] | undefined) {
    if (orderData) {
      if (this.songQueue.order.findIndex(val => val.songID === orderData.songID) === -1) {
        delete this.songQueue.data[orderData.songID]
      }
    }
  }

  @mutation
  private removeFromQueue(index: number) {
    if (index > -1) {
      this.songQueue.order.splice(index, 1)
      if (this.songQueue.order.length === 0) {
        this.currentSong = null
      }
    }
  }

  @action
  public async pop(index: number) {
    if (index > -1) {
      this.removeFromQueue(index)
      this.removeFromQueueData(this.songQueue.order[index])

      if (this.songQueue.index === index) {
        await this.loadSong(this.queueTop)
      }
    }
  }

  @mutation
  private addInSongQueue(item: Song[]) {
    this.songQueue.order.push(...item.map(obj => { return { id: v1(), songID: obj._id! } }))
  }

  @action
  async pushInQueue(item: Song[], top = false) {
    if (item.length > 0) {
      if (!this.currentSong) {
        // Add first item immediately to start playing
        this.addSong([item[0]])
        top ? this.addInQueueTop([item[0]]) : this.addInSongQueue([item[0]])
        item.splice(0, 1)
        await this.nextSong()
      }

      this.addSong(item)
      top ? this.addInQueueTop(item) : this.addInSongQueue(item)
    }

  }

  @mutation
  private addInQueueTop(item: Song[]) {
    this.songQueue.order.splice(this.songQueue.index + 1, 0, ...item.map(obj => {
      return { id: v1(), songID: obj._id! }
    }))
  }

  @mutation
  private incrementQueue() {
    if (this.songQueue.index < this.songQueue.order.length - 1) this.songQueue.index += 1
    else this.songQueue.index = 0
  }

  @action
  async nextSong() {
    this.incrementQueue()
    this.loadSong(this.queueTop)
  }

  @mutation
  private decrementQueue() {
    if (this.songQueue.index > 0) this.songQueue.index -= 1
    else this.songQueue.index = this.songQueue.order.length - 1
  }

  @action
  async prevSong() {
    this.decrementQueue()
    this.loadSong(this.queueTop)
  }

  @mutation loadSong(song: RemoteSong | null | undefined) {
    this.currentSong = song
  }

  @mutation
  private moveIndexTo(index: number) {
    if (index >= 0)
      this.songQueue.index = index
  }

  @action async playQueueSong(index: number) {
    this.moveIndexTo(index)
    this.loadSong(this.queueTop)
  }

  @mutation
  setMode(mode: PeerMode) {
    this.mode = mode
  }

  @mutation
  setRoom(id: string) {
    this.roomID = id
  }

  @mutation
  setSong(song: RemoteSong | null | undefined) {
    this.currentSong = song
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
}
