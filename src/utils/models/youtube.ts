/*
 *  youtube.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import ytMusic from 'node-youtube-music'

export function toSong(...item: ytMusic.MusicVideo[]): Song[] {
  const songs: Song[] = []
  for (const s of item) {
    const highResThumbnail = s.thumbnailUrl && getHighResThumbnail(s.thumbnailUrl)
    songs.push({
      _id: 'youtube-' + s.youtubeId,
      title: s.title ? s.title.trim() : '',
      song_coverPath_high: highResThumbnail,
      song_coverPath_low: s.thumbnailUrl,
      album: {
        album_name: s.album ? s.album.trim() : '',
        album_coverPath_high: highResThumbnail,
        album_coverPath_low: s.thumbnailUrl
      },
      artists: s.artists?.map((val) => val.name) ?? [],
      duration: s.duration?.totalSeconds ?? 0,
      url: s.youtubeId,
      date_added: Date.now(),
      type: 'YOUTUBE'
    })

    console.log(songs)
  }

  return songs
}

function getHighResThumbnail(url: string) {
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
