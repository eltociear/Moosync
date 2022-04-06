import { LocalPlayer } from './local'
import { vxm } from '../../../mainWindow/store/index'
import EventEmitter from 'events'

export class InvidiousPlayer extends LocalPlayer {
  private customLoadEventEmitter = new EventEmitter()

  load(src?: string, volume?: number, autoplay?: boolean): void {
    this.customLoadEventEmitter.emit('loading')
    this.fetchPlaybackURL(src).then((data) => {
      console.log(data)
      this.customLoadEventEmitter.emit('loaded')
      super.load(data, volume, autoplay)
    })
  }

  private async fetchPlaybackURL(str: string | undefined) {
    if (str) {
      if (str.startsWith('http')) {
        return str
      }
      // This won't make a request to youtube
      const resp: InvidiousSong | undefined = await vxm.providers._invidiousProvider.getSongDetails(
        `https://www.youtube.com/watch?v=${str}`
      )
      if (resp) {
        return resp.invidiousPlaybackUrl
      }
    }
  }

  protected listenOnLoad(callback: () => void): void {
    this.customLoadEventEmitter.on('loaded', callback)
    super.listenOnLoad(callback)
  }

  protected listenOnBuffer(callback: () => void): void {
    this.customLoadEventEmitter.on('loading', callback)
    super.listenOnBuffer(callback)
  }
}
