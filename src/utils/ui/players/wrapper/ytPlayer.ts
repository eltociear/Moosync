import YTPlayer from 'yt-player'

export class YTPlayerWrapper implements CustomAudioInstance {
  private supposedVolume
  private instance: YTPlayer

  constructor(element: string | HTMLElement) {
    this.instance = new YTPlayer(element)
    this.supposedVolume = this.volume
    this.instance.on('playing', () => {
      this.volume = this.supposedVolume
    })
  }

  public load() {
    return
  }

  set src(src: string) {
    this.instance.load(src, true)
  }

  set volume(volume: number) {
    this.supposedVolume = volume
    this.instance.setVolume(volume * 100)
  }

  get volume() {
    return this.instance.getVolume() / 100
  }

  get currentTime() {
    return this.instance.getCurrentTime()
  }

  set currentTime(time: number) {
    this.instance.seek(time)
  }

  public async play() {
    this.instance.play()
  }

  public pause() {
    this.instance.pause()
  }

  public stop() {
    this.instance.stop()
  }

  get paused() {
    return (
      this.instance.getState() === 'paused' ||
      this.instance.getState() === 'ended' ||
      this.instance.getState() === 'unstarted'
    )
  }

  set srcObject(o: unknown) {
    return
  }

  set onended(callback: never) {
    this.instance.addListener('ended', callback)
  }

  set ontimeupdate(callback: never) {
    this.instance.addListener('timeupdate', callback)
  }

  set onload(callback: never) {
    this.instance.addListener('cued', callback)
  }

  set onloadeddata(callback: never) {
    // this.instance.on('ended', callback)
  }

  set onerror(callback: never) {
    this.instance.addListener('error', callback)
    this.instance.addListener('unplayable', callback)
  }

  set onloadstart(callback: never) {
    this.instance.addListener('buffering', callback)
  }

  removeAttribute(): void {
    return
  }
  addEventListener(ev: string, callback: (...args: unknown[]) => void) {
    if (ev === 'play') {
      ev = 'playing'
    }

    if (ev === 'pause') {
      ev = 'paused'
    }

    this.instance.addListener(ev, callback)
  }

  removeEventListener(ev: string, callback: (...args: unknown[]) => void) {
    this.instance.removeListener(ev, callback)
  }

  setPlaybackQuality(quality: Parameters<typeof this.instance.setPlaybackQuality>[0]) {
    this.instance.setPlaybackQuality(quality)
  }
}
