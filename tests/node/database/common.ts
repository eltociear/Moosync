/* 
 *  common.ts is a part of Moosync.
 *  
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { SongDBInstance } from "@/utils/main/db/database"
import { v1, v4 } from "uuid"

interface options {
  size?: number
  sameArtists?: boolean
  sameAlbum?: boolean
}

export async function insertSong(SongDB: SongDBInstance, options: options): Promise<Song[]> {
  const generate: Song[] = []

  for (let i = 0; i < (options.size ?? 1); i++) {
    const song = generateSong(options)
    await SongDB.store(song)
    generate.push(song)
  }

  return generate
}

function generateSong(options: options): Song {
  return {
    _id: v1(),
    title: v1(),
    artists: options.sameArtists ? ['Test artist 1', 'Test artist 2'] : [v4(), v4()],
    album: {
      album_name: options.sameAlbum ? 'Test album' : v1(),
    },
    duration: 69,
    date_added: Date.now(),
    type: 'LOCAL'
  }
}

export function insertPlaylist(SongDB: SongDBInstance): Playlist {
  const playlist = generatePlaylist()
  const id = SongDB.createPlaylist(playlist.playlist_name!, playlist.playlist_name!, playlist.playlist_coverPath)
  return {
    playlist_id: id,
    playlist_name: playlist.playlist_name!,
    playlist_coverPath: playlist.playlist_coverPath
  }
}

function generatePlaylist(): Partial<Playlist> {
  return {
    playlist_name: v1(),
    playlist_coverPath: ''
  }
}