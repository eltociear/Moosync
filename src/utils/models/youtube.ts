/* 
 *  youtube.ts is a part of Moosync.
 *  
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { v4 } from 'uuid'
import ytMusic from 'node-youtube-music';

export function toSong(...item: ytMusic.MusicVideo[]): Song[] {
  const songs: Song[] = []
  for (const s of item) {
    songs.push({
      _id: v4(),
      title: s.title ? s.title.trim() : '',
      song_coverPath_high: s.thumbnailUrl?.replace('w60', 'w300').replace('h60', 'h300')!,
      song_coverPath_low: s.thumbnailUrl,
      album: {
        album_name: s.album ? s.album.trim() : '',
        album_coverPath_high: s.thumbnailUrl?.replace('w60', 'w300').replace('h60', 'h300')!,
        album_coverPath_low: s.thumbnailUrl
      },
      artists: s.artists?.map(val => val.name) ?? [],
      duration: s.duration!.totalSeconds,
      url: s.youtubeId,
      date_added: Date.now(),
      type: 'YOUTUBE',
    })
  }
  return songs
}
