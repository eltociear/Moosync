import { LocalPlayer } from './local'
import { vxm } from '../../../mainWindow/store/index'
import EventEmitter from 'events'

export class InvidiousPlayer extends LocalPlayer {
  private customLoadEventEmitter = new EventEmitter()
  private lastAutoPlay = false

  load(src?: string, volume?: number, autoplay?: boolean): void {
    this.customLoadEventEmitter.emit('loading')
    this.fetchPlaybackURL(src).then((data) => {
      this.customLoadEventEmitter.emit('loaded')
      this.lastAutoPlay = autoplay ?? this.lastAutoPlay
      super.load(data, volume, this.lastAutoPlay)
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

  protected listenOnError(callback: (err: Error) => void): void {
    this.playerInstance.onerror = async (event, source, line, col, err) => {
      this.customLoadEventEmitter.emit('loading')
      const baseUrl = new URL((await window.PreferenceUtils.loadSelective<string>('invidious_instance')) ?? '')
      const currentSrc = new URL(((event as ErrorEvent)?.target as HTMLAudioElement)?.src)

      if (baseUrl.host && baseUrl.host !== currentSrc.host) {
        currentSrc.host = new URL(baseUrl).host
        this.load(currentSrc.toString())
      }

      if (err) {
        callback(err)
      }
    }
  }
}
