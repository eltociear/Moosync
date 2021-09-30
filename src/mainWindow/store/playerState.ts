/* 
 *  playerState.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { action, mutation } from 'vuex-class-component';

import { VuexModule } from './module';
import { v1 } from 'uuid';
import { vxm } from '.';

class Queue {
  data: { [id: string]: Song } = {}
  order: { id: string, songID: string }[] = []
  index: number = -1
}

export class PlayerStore extends VuexModule.With({ namespaced: 'player' }) {
  private state: PlayerState = 'PAUSED'
  public currentSong: Song | null | undefined | undefined = null
  private songQueue = new Queue()
  public repeat: boolean = false
  public volume: number = 50
  public timestamp: number = 0
  public loading: boolean = false

  get currentTime() {
    return this.timestamp
  }

  set currentTime(time: number) {
    this.timestamp = time
  }

  get playerState() {
    return this.state
  }

  set playerState(state: PlayerState) {
    this.state = state
  }

  get queue() {
    return this.songQueue
  }

  get Repeat() {
    return this.repeat
  }

  get queueOrder() {
    return this.songQueue.order
  }

  get queueIndex() {
    return this.songQueue.index
  }

  set queueIndex(value: number) {
    this.songQueue.index = value
  }

  set queueOrder(order: { id: string, songID: string }[]) {
    if (order.length === 0) {
      this.currentSong = null
    }

    const diff = this.songQueue.order.filter(x => !order.includes(x));
    for (const item of diff) {
      this.removeFromQueueData(item)
    }

    this.songQueue.order = order
  }

  get queueTop(): Song | null | undefined {
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
      if (s && !this.songQueue.data[s._id!]) {
        this.songQueue.data[s._id!] = s
      }
    }
  }

  @mutation
  private removeFromQueueData(orderData: { id: string, songID: string } | undefined) {
    if (orderData) {
      if (this.songQueue.order.findIndex(val => val.songID === orderData.songID) === -1)
        delete this.songQueue.data[orderData.songID]
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
  async pushInQueue(item: Song[]) {
    if (item.length > 0) {
      if (!this.currentSong) {
        // Add first item immediately to start playing
        this.addSong([item[0]])
        this.addInSongQueue([item[0]])
        item.splice(0, 1)
        this.nextSong()
      }

      this.addSong(item)
      this.addInSongQueue(item)
    }

  }

  @mutation
  private addInQueueTop(item: Song[]) {
    this.songQueue.order.splice(this.songQueue.index + 1, 0, ...item.map(obj => {
      return { id: v1(), songID: obj._id! }
    }))
  }

  @action
  async pushInQueueTop(item: Song[]) {
    if (item.length > 0) {
      // Add first item immediately to start playing
      this.addSong([item[0]])
      this.addInQueueTop([item[0]])
      await this.nextSong()

      item.splice(0, 1)

      this.addSong(item)
      this.addInQueueTop(item)
    }
  }

  @mutation
  private incrementQueue() {
    if (this.songQueue.index < this.songQueue.order.length - 1) this.songQueue.index += 1
    else this.songQueue.index = 0
  }

  @action
  async nextSong() {
    vxm.player.currentTime = 0
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

  @mutation
  shuffle() {
    const currentSong = this.songQueue.order[this.songQueue.index]
    this.songQueue.order.splice(this.songQueue.index, 1)

    // https://stackoverflow.com/a/12646864
    for (let i: number = this.songQueue.order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = this.songQueue.order[i]
      this.songQueue.order[i] = this.songQueue.order[j]
      this.songQueue.order[j] = temp
    }

    this.songQueue.order.unshift(currentSong)
    this.songQueue.index = 0
  }

  @mutation
  private setPlayerState(state: PlayerState) {
    this.state = state
  }

  @action async loadSong(song: Song | null | undefined) {
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
}
