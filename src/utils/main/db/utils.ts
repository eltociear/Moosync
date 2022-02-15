/* 
 *  utils.ts is a part of Moosync.
 *  
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import DB, { BetterSqlite3Helper } from 'better-sqlite3-helper'

import { app } from 'electron'
import { migrations } from './migrations'
import path from 'path'

export class DBUtils {
  protected db: BetterSqlite3Helper.DBInstance

  constructor(dbPath?: string) {
    this.db = DB({
      path: dbPath ?? path.join(app.getPath('appData'), app.getName(), 'databases', 'songs.db'),
      readonly: false,
      fileMustExist: false,
      WAL: true,
      migrate: {
        migrations: migrations,
      },
    })
    this.registerRegexp()

    if (app)
      app.addListener('before-quit', this.close)
  }

  public close() {
    if (this.db && this.db.open)
      this.db.close()
  }

  protected unMarshalSong(dbSong: marshaledSong): Song {
    return {
      _id: dbSong._id,
      path: dbSong.path,
      size: dbSong.size,
      title: dbSong.title,
      song_coverPath_high: dbSong.song_coverPath_high,
      song_coverPath_low: dbSong.song_coverPath_low,
      album: {
        album_id: dbSong.album_id,
        album_name: dbSong.album_name,
        album_coverPath_high: dbSong.album_coverPath_high,
        album_coverPath_low: dbSong.album_coverPath_low,
        album_song_count: dbSong.album_song_count,
        year: dbSong.year,
      },
      date: dbSong.date,
      year: dbSong.year,
      artists: dbSong.artist_name ? dbSong.artist_name.split(',') : [],
      genre: dbSong.genre_name ? dbSong.genre_name.split(',') : [],
      lyrics: dbSong.lyrics,
      releaseType: undefined,
      bitrate: dbSong.bitrate,
      codec: dbSong.codec,
      container: dbSong.container,
      duration: dbSong.duration,
      sampleRate: dbSong.sampleRate,
      hash: dbSong.hash,
      inode: '',
      deviceno: '',
      type: dbSong.type,
      url: dbSong.url,
      date_added: dbSong.date_added,
      playbackUrl: dbSong.playbackUrl
    }
  }

  protected marshalSong(song: Song): marshaledSong {
    if (!song._id) {
      throw new Error("song _id cannot be null")
    }

    return {
      _id: song._id,
      path: song.path?.trim(),
      size: song.size,
      title: song.title.trim(),
      song_coverPath_high: song.song_coverPath_high?.trim(),
      song_coverPath_low: song.song_coverPath_low?.trim(),
      date: song.date,
      year: song.year,
      lyrics: song.lyrics,
      bitrate: song.bitrate,
      codec: song.codec,
      container: song.container,
      duration: song.duration,
      sampleRate: song.sampleRate,
      hash: song.hash?.trim(),
      inode: song.inode,
      deviceno: song.deviceno,
      type: song.type,
      url: song.url?.trim(),
      playbackUrl: song.playbackUrl?.trim(),
      date_added: Date.now()
    }
  }

  protected batchUnmarshal(marshaled: marshaledSong[]) {
    const unmarshaled: Song[] = []
    for (const m of marshaled) {
      unmarshaled.push(this.unMarshalSong(m))
    }
    return unmarshaled
  }

  protected registerRegexp() {
    this.db.function('regexp', (pattern: string, str: string) => {
      return str.match(new RegExp(pattern, 'i')) ? 1 : 0
    })
  }

  protected addExcludeWhereClause(where: boolean, exclude?: string[]): string {
    return exclude && exclude.length > 0
      ? `${where ? 'WHERE' : 'AND '} allsongs.path NOT REGEXP '${exclude.join('|').replaceAll('\\', '\\\\')}'`
      : ''
  }

  private leftJoinSongs(bridgeTable?: string, exclude_table?: string) {
    if (exclude_table !== 'allsongs') {
      return ` LEFT JOIN allsongs ON ${bridgeTable}.song = allsongs._id`
    }
    return ''
  }

  private leftJoinAlbums(exclude_table?: string) {
    if (exclude_table !== 'album') {
      return ` LEFT JOIN album_bridge ON allsongs._id = album_bridge.song`
    }
    return ''
  }

  private leftJoinArtists(exclude_table?: string) {
    if (exclude_table !== 'artists') {
      return ` LEFT JOIN artists_bridge ON allsongs._id = artists_bridge.song`
    }
    return ''
  }

  private leftJoinGenre(exclude_table?: string) {
    if (exclude_table !== 'genre') {
      return ` LEFT JOIN genre_bridge ON allsongs._id = genre_bridge.song`
    }
    return ''
  }

  private leftJoinPLaylists(exclude_table?: string) {
    if (exclude_table !== 'playlists') {
      return ` LEFT JOIN playlist_bridge ON allsongs._id = playlist_bridge.song`
    }
    return ''
  }

  private leftJoinCommon(tableName: string, rowName: string, bridgeTable?: string) {
    return ` LEFT JOIN ${tableName} ON ${bridgeTable}.${rowName} = ${tableName}.${rowName}_id`
  }

  protected addLeftJoinClause(bridgeTable?: string, exclude_table?: 'album' | 'artists' | 'genre' | 'allsongs') {
    return (
      this.leftJoinSongs(bridgeTable, exclude_table) +
      this.leftJoinAlbums(exclude_table) +
      this.leftJoinArtists(exclude_table) +
      this.leftJoinGenre(exclude_table) +
      this.leftJoinPLaylists(exclude_table) +
      this.leftJoinCommon('albums', 'album', 'album_bridge') +
      this.leftJoinCommon('artists', 'artist', 'artists_bridge') +
      this.leftJoinCommon('genre', 'genre', 'genre_bridge') +
      this.leftJoinCommon('playlists', 'playlist', 'playlist_bridge')
    )
  }

  protected addGroupConcatClause() {
    return 'group_concat(artist_name) as artist_name, group_concat(genre_name) as genre_name'
  }
}
