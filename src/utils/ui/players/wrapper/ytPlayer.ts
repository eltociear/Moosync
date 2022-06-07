import YTPlayer from 'yt-player'

export class YTPlayerWrapper implements CustomAudioInstance {
  private supposedVolume = 100
  private instance: YTPlayer

  constructor(element: string | HTMLElement) {
    this.instance = new YTPlayer(element)
  }

  public load() {
    return
  }

  set src(src: string) {
    this.instance.load(src, true)
  }

  set volume(volume: number) {
    this.supposedVolume = volume * 100
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

  onended(callback: any) {
    this.instance.addListener('ended', callback)
  }

  set ontimeupdate(callback: any) {
    this.instance.addListener('timeupdate', callback)
  }

  set onload(callback: any) {
    this.instance.addListener('cued', callback)
  }

  set onloadeddata(callback: any) {
    // this.instance.on('ended', callback)
  }

  set onerror(callback: any) {
    this.instance.addListener('error', callback)
    this.instance.addListener('unplayable', callback)
  }

  set onloadstart(callback: any) {
    this.instance.addListener('buffering', callback)
  }

  removeAttribute(str: string): void {
    return
  }
  addEventListener(ev: string, callback: (...args: any[]) => void) {
    if (ev === 'play') {
      ev = 'playing'
      this.volume = this.supposedVolume
    }

    if (ev === 'pause') {
      ev = 'paused'
    }

    this.instance.addListener(ev, callback)
  }

  removeEventListener(ev: string, callback: (...args: any[]) => void) {
    this.instance.removeListener(ev, callback)
  }

  setPlaybackQuality(quality: Parameters<typeof this.instance.setPlaybackQuality>[0]) {
    this.instance.setPlaybackQuality(quality)
  }
}
