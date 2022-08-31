/*
 *  searchYT.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import * as ytMusic from 'node-youtube-music'
import { app } from 'electron'
import path from 'path'
import { CacheHandler } from './cacheFile'
import ytsr from 'ytsr'
import ytdl from 'ytdl-core'

interface YTMusicWMatchIndex extends Song {
  matchIndex: number
}

export class YTScraper extends CacheHandler {
  constructor() {
    super(path.join(app.getPath('sessionData'), app.getName(), 'youtube.cache'))
  }

  private getHighResThumbnail(url: string) {
    const urlParts = url.split('=')
    if (urlParts.length === 2) {
      const queryParts = urlParts[1].split('-')
      if (queryParts.length >= 4) {
        queryParts[0] = 'w800'
        queryParts[1] = 'h800'
      }

      return urlParts[0] + '=' + queryParts.join('-')
    }

    return url.replace('w60', 'w800').replace('h60', 'h800').replace('w120', 'w800').replace('h120', 'h800')
  }

  public async searchTerm(
    title: string,
    artists?: string[],
    matchTitle = true,
    scrapeYTMusic = true,
    scrapeYoutube = false
  ): Promise<SearchResult> {
    const term = `${artists ? artists.join(', ') + ' - ' : ''}${title}`

    const cached = this.getCache(term + '-search')
    if (cached) {
      const data = JSON.parse(cached)
      if (data.songs && data.artists && data.playlists && data.albums && data.genres) {
        return data
      }
    }

    const promises = []
    const res: SearchResult = {
      songs: [],
      artists: [],
      playlists: [],
      albums: [],
      genres: []
    }
    try {
      scrapeYTMusic &&
        promises.push(
          this.scrapeYTMusic(title, artists, matchTitle).then((data) => {
            res.songs.push(...data.songs)
            res.artists.push(...data.artists)
            res.playlists.push(...data.playlists)
            res.albums.push(...data.albums)
            res.genres.push(...data.genres)
          })
        )

      scrapeYoutube &&
        promises.push(
          this.scrapeYoutube(title, artists, matchTitle).then((data) => {
            res.songs.push(...data.songs)
            res.artists.push(...data.artists)
            res.playlists.push(...data.playlists)
            res.albums.push(...data.albums)
            res.genres.push(...data.genres)
          })
        )

      await Promise.all(promises)

      if (
        res.songs.length > 0 ||
        res.artists.length > 0 ||
        res.playlists.length > 0 ||
        res.albums.length > 0 ||
        res.genres.length > 0
      ) {
        this.addToCache(term + '-search', JSON.stringify(res))
      }
      return res
    } catch (e) {
      console.error('Failed to fetch search results from Youtube', e)
    }

    return res
  }

  private parseYoutubeMusicSong(...item: ytMusic.MusicVideo[]): Song[] {
    const songs: Song[] = []
    for (const s of item) {
      const highResThumbnail = s.thumbnailUrl && this.getHighResThumbnail(s.thumbnailUrl)
      songs.push({
        _id: 'youtube:' + s.youtubeId,
        title: s.title ? s.title.trim() : '',
        song_coverPath_high: highResThumbnail,
        song_coverPath_low: s.thumbnailUrl,
        album: {
          album_name: s.album ? s.album.trim() : '',
          album_coverPath_high: highResThumbnail,
          album_coverPath_low: s.thumbnailUrl
        },
        artists:
          s.artists?.map((val) => ({
            artist_id: `youtube-author:${val.id}`,
            artist_name: val.name,
            artist_extra_info: {
              youtube: {
                channel_id: val.id
              }
            }
          })) ?? [],
        duration: s.duration?.totalSeconds ?? 0,
        url: s.youtubeId,
        date_added: Date.now(),
        type: 'YOUTUBE'
      })
    }

    return songs
  }

  private parseYoutubeMusicArtist(...artist: ytMusic.Artist[]): Artists[] {
    const artists: Artists[] = []
    for (const a of artist) {
      console.log(a.thumbnails?.find((val) => val))
      artists.push({
        artist_id: `youtube-author:${a.artistId}`,
        artist_name: a.name,
        artist_coverPath: a.thumbnails?.find((val) => val),
        artist_extra_info: {
          youtube: {
            channel_id: a.artistId
          }
        }
      })
    }

    return artists
  }

  private parseYoutubeMusicPlaylist(...playlist: ytMusic.PlaylistPreview[]): Playlist[] {
    const playlists: Playlist[] = []
    for (const a of playlist) {
      playlists.push({
        playlist_id: `youtube-author:${a.playlistId}`,
        playlist_name: a.title ?? '',
        playlist_coverPath: a.thumbnailUrl
      })
    }

    return playlists
  }

  private async scrapeYTMusic(title: string, artists?: string[], matchTitle = true) {
    const term = `${artists ? artists.join(', ') + ' - ' : ''}${title}`
    const ret: SearchResult = {
      songs: [],
      artists: [],
      playlists: [],
      albums: [],
      genres: []
    }

    ret.songs = this.parseYoutubeMusicSong(...(await ytMusic.searchMusics(term)))
    ret.artists = this.parseYoutubeMusicArtist(...(await ytMusic.searchArtists(term)))
    ret.playlists = this.parseYoutubeMusicPlaylist(...(await ytMusic.searchPlaylists(term)))

    if (matchTitle) {
      ret.songs = this.sortByMatches(title, ret.songs)
    }

    return ret
  }

  private parseYoutubeDuration(dur: string) {
    const split = dur.split(':')
    let ret = 0
    for (let i = split.length - 1; i >= 0; i--) {
      ret += parseInt(split[i]) * Math.pow(60, split.length - i - 1)
    }
    return ret
  }

  private parseYoutubeVideo(vid: ytsr.Video): Song {
    const highResThumbnail = vid.bestThumbnail?.url && this.getHighResThumbnail(vid.bestThumbnail.url)
    return {
      _id: 'youtube:' + vid.id,
      title: vid.title ? vid.title.trim() : '',
      song_coverPath_high: highResThumbnail ?? undefined,
      song_coverPath_low: vid.bestThumbnail?.url ?? vid.thumbnails.find((val) => val.url)?.url ?? undefined,
      artists: vid.author
        ? [
            {
              artist_id: `youtube-author:${vid.author.channelID}`,
              artist_name: vid.author.name,
              artist_coverPath: vid.author.bestAvatar?.url ?? undefined,
              artist_extra_info: {
                youtube: {
                  channel_id: vid.author.channelID
                }
              }
            }
          ]
        : undefined,
      duration: vid.duration ? this.parseYoutubeDuration(vid.duration ?? '') : 0,
      url: vid.url,
      date_added: Date.now(),
      type: 'YOUTUBE'
    }
  }

  private parseYoutubeChannel(channel: ytsr.Channel): Artists {
    return {
      artist_id: `youtube-author:${channel.channelID}`,
      artist_name: channel.name,
      artist_coverPath: channel.bestAvatar?.url ?? undefined,
      artist_extra_info: {
        youtube: {
          channel_id: channel.channelID
        }
      }
    }
  }

  private parseYoutubePlaylists(playlist: ytsr.Playlist): Playlist {
    const highResThumbnail =
      playlist.firstVideo?.bestThumbnail?.url && this.getHighResThumbnail(playlist.firstVideo?.bestThumbnail.url)
    return {
      playlist_id: `youtube-playlist:${playlist.playlistID}`,
      playlist_name: playlist.title,
      playlist_coverPath: highResThumbnail ?? undefined
    }
  }

  private async scrapeYoutube(title: string, artists?: string[], matchTitle = true) {
    const term = `${artists ? artists.join(', ') + ' - ' : ''}${title}`

    const resp = await ytsr(term)
    console.log(resp)
    const ret: SearchResult = {
      songs: [],
      artists: [],
      playlists: [],
      albums: [],
      genres: []
    }
    for (const vid of resp.items) {
      if (vid.type === 'video') {
        ret.songs.push(this.parseYoutubeVideo(vid))
      }

      if (vid.type === 'channel') {
        ret.artists.push(this.parseYoutubeChannel(vid))
      }

      if (vid.type === 'playlist') {
        ret.playlists.push(this.parseYoutubePlaylists(vid))
      }
    }

    if (matchTitle) {
      ret.songs = this.sortByMatches(title, ret.songs)
    }

    return ret
    // return matchTitle ? this.sortByMatches(title, songs) : songs
  }

  public async getSuggestions(videoID: string) {
    const cached = this.getCache(videoID)
    if (cached) {
      return this.parseYoutubeMusicSong(...JSON.parse(cached))
    }

    try {
      const resp = await ytMusic.getSuggestions(videoID)
      const parsed = this.parseYoutubeMusicSong(...resp)
      if (parsed.length > 0) {
        this.addToCache(videoID, JSON.stringify(resp))
      }
      return parsed
    } catch (e) {
      console.error('Failed to fetch suggestions from Youtube', e)
    }

    return []
  }

  private sortByMatches(searchTerm: string, songs: Song[]) {
    const finalMatches: YTMusicWMatchIndex[] = []

    for (const s of songs) {
      if (s.title) {
        if (s.title.match(new RegExp(searchTerm, 'i'))) {
          finalMatches.push({
            ...s,
            matchIndex: 1
          })
        } else {
          const matchIndex = this.calculateLevenshteinDistance(searchTerm, s.title)
          if (matchIndex > 0.5) {
            finalMatches.push({
              ...s,
              matchIndex
            })
          }
        }
      }
    }

    return finalMatches.sort((a, b) => b.matchIndex - a.matchIndex)
  }

  private calculateLevenshteinDistance(s1: string, s2: string) {
    let longer = s1
    let shorter = s2
    if (s1.length < s2.length) {
      longer = s2
      shorter = s1
    }
    const longerLength = longer.length
    if (longerLength == 0) {
      return 1.0
    }
    return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength.toString())
  }

  private editDistance(s1: string, s2: string) {
    s1 = s1.toLowerCase()
    s2 = s2.toLowerCase()

    const costs = []
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i
      for (let j = 0; j <= s2.length; j++) {
        if (i == 0) costs[j] = j
        else {
          if (j > 0) {
            let newValue = costs[j - 1]
            if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
            costs[j - 1] = lastValue
            lastValue = newValue
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue
    }
    return costs[s2.length]
  }

  public async getWatchURL(id: string) {
    const cache = this.getCache(`watchURL:${id}`)
    if (cache) {
      return cache
    }

    const data = await ytdl.getInfo(id)

    let format
    try {
      format = ytdl.chooseFormat(data.formats, {
        quality: 'highestaudio'
      })
    } catch (e) {
      format = ytdl.chooseFormat(data.formats, {})
    }

    try {
      const expiry = parseInt(new URL(format.url).searchParams.get('expire') ?? '0') * 1000
      expiry > 0 && this.addToCache(`watchURL:${id}`, format.url, expiry)
    } catch (e) {
      console.warn('Failed to add watch URL to cache', format.url)
    }
    return format.url
  }
}
