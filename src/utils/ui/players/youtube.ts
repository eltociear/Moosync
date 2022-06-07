/*
 *  youtube.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Segment, SponsorBlock } from 'sponsorblock-api'
import { v4 } from 'uuid'
import { YTPlayerWrapper } from './wrapper/ytPlayer'
import { LocalPlayer } from './local'

type YouTubePlayerQuality = 'small' | 'medium' | 'large' | 'hd720' | 'hd1080' | 'highres' | 'default'

export class YoutubePlayer extends LocalPlayer {
  private sponsorBlock = new SponsorBlock(v4())

  private currentSegments: Segment[] = []

  constructor(playerInstance: HTMLDivElement, useEmbed = true) {
    if (useEmbed) {
      super(new YTPlayerWrapper(playerInstance))
    } else {
      const audio = document.createElement('audio')
      audio.crossOrigin = 'anonymous'
      audio.preload = 'auto'
      playerInstance.append(audio)
      super(audio)
    }
  }

  private async getSponsorblock(videoID: string) {
    const preferences = await window.PreferenceUtils.loadSelective<Checkbox[]>('audio')
    if (preferences) {
      const sponsorblock = preferences.find((val) => val.key === 'sponsorblock')
      if (sponsorblock && sponsorblock.enabled) {
        try {
          const segments = await this.sponsorBlock.getSegments(videoID, [
            'sponsor',
            'intro',
            'music_offtopic',
            'selfpromo',
            'interaction',
            'preview'
          ])
          this.currentSegments = segments
        } catch (e) {
          console.warn(e)
        }
      }
    }
  }

  private extractVideoID(url: string) {
    try {
      return new URL(url).searchParams.get('v') ?? undefined
    } catch (e) {
      console.debug('Not a URL', url)
    }
    return url
  }

  async load(src?: string, volume?: number, autoplay?: boolean) {
    if (src) {
      src = this.extractVideoID(src)
      if (src) {
        this.getSponsorblock(src)
        if (this.playerInstance instanceof HTMLAudioElement) src = await window.SearchUtils.getYTAudioURL(src)
      }
    }

    if (src) {
      src && (this.playerInstance.src = src)
      volume && (this.volume = volume)
      autoplay && this.play()
    }
    volume && (this.volume = volume)
  }

  protected listenOnTimeUpdate(callback: (time: number) => void): void {
    let lastTime = 0
    this.playerInstance.ontimeupdate = () => {
      const time = this.currentTime
      if (time !== lastTime) {
        const segs = this.currentSegments.filter((val) => val.startTime === Math.floor(time))
        if (segs.length > 0) {
          const seg = segs.sort((a, b) => b.endTime - a.endTime).at(0)
          if (seg) {
            this.currentTime = seg.endTime
          }
        }

        callback(time)
        lastTime = time
      }
    }
  }

  public setPlaybackQuality(quality: YouTubePlayerQuality) {
    if (this.playerInstance instanceof YTPlayerWrapper) {
      this.playerInstance.setPlaybackQuality(quality)
    }
  }
}
