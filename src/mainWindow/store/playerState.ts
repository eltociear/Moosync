import { Action, Module, Mutation, VuexModule } from 'vuex-class-modules'

import { Song } from '@/models/songs'
import store from '@/commonStore'

export enum AudioType {
  STREAMING,
  LOCAL,
}

export enum PlayerState {
  PLAYING,
  PAUSED,
  STOPPED,
}

export enum PlayerType {
  LOCAL,
  YOUTUBE,
}

class Queue {
  data: { [id: string]: Song } = {}
  order: string[] = []
  index: number = -1

  get top(): Song | null {
    if (this.index > -1 && this.data) {
      return this.data[this.order[this.index]]
    }
    return null
  }

  private addSong(item: Song) {
    if (!this.data[item._id!]) {
      this.data[item._id!] = item
    }
  }

  public push(item: Song): void {
    this.addSong(item)
    this.order.push(item._id!)
  }

  public pushAtIndex(item: Song): void {
    this.addSong(item)
    this.order.splice(this.index + 1, 0, item._id!)
  }

  public next() {
    if (this.index < this.order.length - 1) this.index += 1
    else this.index = 0
  }

  public prev() {
    if (this.index >= 0) this.index -= 1
    else this.index = this.order.length - 1
  }

  public pop(): Song | null {
    if (this.index > 0) {
      let id = this.order.pop()
      return this.data[id!]
    }
    return null
  }
}

@Module
class Player extends VuexModule {
  private state: PlayerState = PlayerState.PAUSED
  private type: PlayerType = PlayerType.LOCAL
  private currentSongDets: Song | null = null
  private songQueue = new Queue()

  get playerState() {
    return this.state
  }

  get currentSong() {
    return this.currentSongDets
  }

  get queue() {
    return this.songQueue
  }

  get playerType() {
    return this.type
  }

  @Mutation
  setState(state: PlayerState) {
    this.state = state
  }

  @Mutation
  setPlayerType(type: PlayerType) {
    this.type = type
  }

  @Mutation
  loadInQueue(Song: Song) {
    this.songQueue.push(Song)
  }

  @Mutation
  setSong(song: Song | null) {
    this.currentSongDets = song
  }

  @Mutation
  loadInQueueTop(Song: Song) {
    this.songQueue.pushAtIndex(Song)
  }

  @Action
  loadSong(song: Song | null) {
    if (song && song.type == 'YOUTUBE') {
      this.setPlayerType(PlayerType.YOUTUBE)
    } else {
      this.setPlayerType(PlayerType.LOCAL)
    }
    this.setSong(song)
  }

  @Action
  pushInQueue(Song: Song) {
    this.loadInQueue(Song)
    if (this.currentSongDets == null) {
      this.nextSong()
    }
  }

  @Action
  pushInQueueTop(Song: Song) {
    this.loadInQueueTop(Song)
  }

  @Action
  nextSong() {
    this.songQueue.next()
    this.loadSong(this.songQueue.top)
  }
  @Action
  prevSong() {
    this.songQueue.prev()
    this.loadSong(this.songQueue.top)
  }
}

export const PlayerModule = new Player({ store, name: 'player' })