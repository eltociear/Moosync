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
        migrations: migrations
      }
    })
    this.registerRegexp()
  }

  public close() {
    if (this.db && this.db.open) this.db.close()
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
        year: dbSong.album_year
      },
      date: dbSong.date,
      year: dbSong.year,
      artists: this.parseArtists(dbSong.artists ?? ''),
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
      icon: dbSong.icon,
      date_added: dbSong.date_added,
      playbackUrl: dbSong.playbackUrl,
      providerExtension: dbSong.provider_extension
    }
  }

  private parseArtists(artistStr: string) {
    const artists = artistStr.split(';')
    const ret: Artists[] = []
    for (const a of artists) {
      const split = a.split(',')
      if (split[0] && split[1] && ret.findIndex((val) => val.artist_id === split[0]) === -1) {
        ret.push({
          artist_id: split[0],
          artist_name: split[1],
          artist_coverPath: split[2],
          artist_mbid: split[3],
          artist_song_count: parseInt(split[4]),
          artist_extra_info: JSON.parse(split.slice(5).join(',') || '{}')
        })
      }
    }

    return ret
  }

  protected marshalSong(song: Partial<Song>): marshaledSong {
    if (!song._id) {
      throw new Error('song _id cannot be null')
    }

    return {
      _id: song._id,
      path: song.path?.trim(),
      size: song.size,
      title: song.title?.trim() ?? '',
      song_coverPath_high: song.song_coverPath_high?.trim(),
      song_coverPath_low: song.song_coverPath_low?.trim(),
      date: song.date,
      year: song.year,
      lyrics: song.lyrics,
      bitrate: song.bitrate,
      codec: song.codec,
      container: song.container,
      duration: song.duration ?? 0,
      sampleRate: song.sampleRate,
      hash: song.hash?.trim(),
      inode: song.inode,
      deviceno: song.deviceno,
      type: song.type ?? 'URL',
      url: song.url?.trim(),
      playbackUrl: song.playbackUrl?.trim(),
      date_added: Date.now(),
      icon: song.icon,
      provider_extension: song.providerExtension
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
      if (str != null) {
        return str.match(new RegExp(pattern, 'i')) ? 1 : 0
      }
      return 0
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
    return `group_concat(artist_id||','||artist_name||','||COALESCE(artist_coverPath, '')||','||COALESCE(artist_mbid, '')||','||artist_song_count||','||COALESCE(artist_extra_info, ''), ';') as artists, group_concat(genre_name) as genre_name`
  }

  protected getSelectClause() {
    return `allsongs._id, allsongs.path, allsongs.size, allsongs.title, allsongs.song_coverPath_high, allsongs.song_coverPath_low, allsongs.date, allsongs.date_added, allsongs.year, allsongs.lyrics, allsongs.bitrate, allsongs.codec, allsongs.container, allsongs.duration, allsongs.sampleRate, allsongs.hash, allsongs.type, allsongs.url, allsongs.icon, allsongs.playbackUrl, allsongs.provider_extension, albums.album_id, albums.album_name, albums.album_coverPath_high, albums.album_coverPath_low, albums.album_song_count, albums.year as album_year, artists.artist_name, artists.artist_id, artists.artist_coverPath, artists.artist_song_count, artists.artist_mbid, genre.genre_name`
  }
}
