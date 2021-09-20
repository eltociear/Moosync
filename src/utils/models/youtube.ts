/* 
 *  youtube.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { v4 } from 'uuid'

export function toSong(...item: YoutubeItem[]): Song[] {
  const songs: Song[] = []
  for (const s of item) {
    songs.push({
      _id: v4(),
      title: s.yt_title ? s.yt_title.trim() : '',
      song_coverPath_low: s.yt_coverImage?.replace('w60', 'w300').replace('h60', 'h300')!,
      album: {
        album_name: s.yt_album ? s.yt_album.trim() : '',
        album_coverPath_low: s.yt_coverImage?.replace('w60', 'w300').replace('h60', 'h300')!,
      },
      artists: s.yt_artist ? s.yt_artist.trim().split(/,|&/) : [],
      duration: s.duration,
      url: s._id.trim(),
      date_added: Date.now().toString(),
      type: 'YOUTUBE',
    })
  }
  return songs
}
