/*
 *  database.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { DBUtils } from './utils'
import { promises as fsP } from 'fs'
import { v4 } from 'uuid'
import { sanitizeArtistName } from '../../common'

import { loadPreferences } from './preferences'
import path from 'path'
import fs from 'fs'
import https from 'https'
import http from 'http'

type KeysOfUnion<T> = T extends T ? keyof T : never
// AvailableKeys will basically be keyof Foo | keyof Bar
// so it will be  "foo" | "bar"
type EntityKeys = KeysOfUnion<EntityApiOptions>

export class SongDBInstance extends DBUtils {
  /* ============================= 
                ALLSONGS
     ============================= */

  private verifySong(song: Partial<Song>) {
    return !!(song._id && song.title && song.date_added && song.duration && song.type)
  }

  private getSongId(oldId: string, providerExtension?: string) {
    if (providerExtension) {
      if (oldId.startsWith(`${providerExtension}:`)) {
        return oldId
      } else {
        return `${providerExtension}:${oldId}`
      }
    }

    return oldId
  }

  public store(newDoc: Partial<Song>): boolean {
    if (this.verifySong(newDoc)) {
      const existing = this.getSongByOptions({ song: { _id: newDoc._id } })[0]
      if (existing) {
        return false
      }

      const artistID = newDoc.artists ? this.storeArtists(...newDoc.artists) : []
      const albumID = newDoc.album ? this.storeAlbum(newDoc.album) : ''
      const genreID = newDoc.genre ? this.storeGenre(...newDoc.genre) : []

      newDoc._id = this.getSongId(newDoc._id ?? v4(), newDoc.providerExtension)
      const marshaledSong = this.marshalSong(newDoc)

      this.db.insert('allsongs', marshaledSong)
      this.storeArtistBridge(artistID, marshaledSong._id)
      this.storeGenreBridge(genreID, marshaledSong._id)
      this.storeAlbumBridge(albumID, marshaledSong._id)

      this.updateAllSongCounts()

      return true
    }

    return false
  }

  private updateAllSongCounts() {
    this.updateSongCountAlbum()
    this.updateSongCountArtists()
    this.updateSongCountGenre()
    this.updateSongCountPlaylists()
  }

  private getCountBySong(bridge: string, column: string, song: string) {
    const data = this.db.query(`SELECT ${column} FROM ${bridge} WHERE song = ?`, song)
    const counts = []
    for (const i of data) {
      counts.push(
        ...this.db.query(`SELECT count(id) as count, ${column} FROM ${bridge} WHERE ${column} = ?`, i[column])
      )
    }

    return counts
  }

  /**
   * Removes song by its ID. Also removes references to albums, artists, genre, playlist and unlinks thumbnails.
   * @param song_id id of song to remove
   */
  public async removeSong(song_id: string) {
    const pathsToRemove: string[] = []
    this.db
      .transaction((song_id: string) => {
        const album_ids = this.getCountBySong('album_bridge', 'album', song_id)
        const artist_ids = this.getCountBySong('artists_bridge', 'artist', song_id)

        const songCoverPath_low = this.db.queryFirstCell(
          `SELECT song_coverPath_low from allsongs WHERE _id = ?`,
          song_id
        )
        const songCoverPath_high = this.db.queryFirstCell(
          `SELECT song_coverPath_high from allsongs WHERE _id = ?`,
          song_id
        )

        if (songCoverPath_low) pathsToRemove.push(songCoverPath_low)
        if (songCoverPath_high) pathsToRemove.push(songCoverPath_high)

        this.db.delete('artists_bridge', { song: song_id })
        this.db.delete('album_bridge', { song: song_id })
        this.db.delete('genre_bridge', { song: song_id })
        this.db.delete('playlist_bridge', { song: song_id })
        this.db.delete('allsongs', { _id: song_id })

        for (const id of album_ids) {
          if (id.count === 1) {
            const album: Album = (
              this.getEntityByOptions({
                album: {
                  album_id: id.album
                }
              }) as Album[]
            )[0]
            this.db.delete('albums', { album_id: id.album })
            if (album?.album_coverPath_low) pathsToRemove.push(album.album_coverPath_low)
            if (album?.album_coverPath_high) pathsToRemove.push(album.album_coverPath_high)
          }
        }

        for (const id of artist_ids) {
          if (id.count === 1) {
            const artist = (
              this.getEntityByOptions({
                artist: {
                  artist_id: id.artist
                }
              }) as Artists[]
            )[0]
            this.db.delete('artists', { artist_id: id.artist })
            if (artist?.artist_coverPath) pathsToRemove.push(artist.artist_coverPath)
          }
        }
      })
      .immediate(song_id)

    for (const path of pathsToRemove) {
      await fsP.rm(path, { force: true })
    }

    this.updateAllSongCounts()
  }

  private updateSongArtists(newArtists: Artists[], oldArtists: Artists[] | undefined, songID: string) {
    if (JSON.stringify(oldArtists) !== JSON.stringify(newArtists)) {
      this.db.delete('artists_bridge', { song: songID })

      for (const a of oldArtists ?? []) {
        if (!newArtists.find((val) => val.artist_name === a.artist_name)) {
          const songCount = this.db.queryFirstCell<number>(
            'SELECT COUNT(id) FROM artists_bridge WHERE artist = ?',
            a.artist_id
          )
          if (songCount === 0) {
            this.db.delete('artists', { artist_id: a.artist_id })
            if (a.artist_coverPath) {
              fsP.rm(a.artist_coverPath, { force: true })
            }
          }
        }
      }

      const artistIDs = this.storeArtists(...newArtists)
      this.storeArtistBridge(artistIDs, songID)
    }
  }

  private updateSongGenre(newGenres: string[], oldGenres: string[] | undefined, songID: string) {
    if (JSON.stringify(newGenres) !== JSON.stringify(oldGenres)) {
      this.db.delete('genre_bridge', { song: songID })

      for (const g of oldGenres ?? []) {
        if (!newGenres.includes(g)) {
          const songCount = this.db.queryFirstCell<number>('SELECT COUNT(id) FROM genre_bridge WHERE genre = ?', g)
          if (songCount === 0) {
            this.db.delete('genre', { genre_id: g })
          }
        }
      }

      const genreIDs = this.storeGenre(...newGenres)
      this.storeGenreBridge(genreIDs, songID)
    }
  }

  private updateSongAlbums(newAlbum: Album, oldAlbum: Album | undefined, songID: string) {
    this.db.delete('album_bridge', { song: songID })

    if (JSON.stringify(newAlbum) !== JSON.stringify(oldAlbum)) {
      if (oldAlbum?.album_id) {
        const songCount = this.db.queryFirstCell<number>(
          'SELECT COUNT(id) FROM album_bridge WHERE album = ?',
          oldAlbum.album_id
        )
        if (songCount === 0) {
          this.db.delete('albums', { album_id: oldAlbum.album_id })
          if (oldAlbum.album_coverPath_high) fsP.rm(oldAlbum.album_coverPath_high, { force: true })
          if (oldAlbum.album_coverPath_low) fsP.rm(oldAlbum.album_coverPath_low, { force: true })
        }
      }

      const albumIDs = this.storeAlbum(newAlbum)
      this.storeAlbumBridge(albumIDs, songID)
    }
  }

  private async getCoverPath(oldCoverPath: string, newCoverpath: string, songID: string) {
    if (oldCoverPath !== newCoverpath) {
      if (newCoverpath) {
        const finalPath = path.join(loadPreferences().thumbnailPath, songID + (path.extname(newCoverpath) ?? '.png'))
        if (newCoverpath.startsWith('http')) {
          await this.downloadFile(newCoverpath, finalPath)
          return finalPath
        }
        await fsP.copyFile(newCoverpath, finalPath)
        return finalPath
      }
    }
    return oldCoverPath
  }

  private downloadFile(url: string, path: string) {
    return new Promise<void>((resolve) => {
      const file = fs.createWriteStream(path)
      const parsedURL = new URL(url)
      const method = parsedURL.protocol === 'https:' ? https.get : http.get
      const request = method(url, function (response) {
        response.pipe(file)

        file.on('finish', () => {
          console.debug('Downloaded image from', url, 'at', path)
          file.close()
          resolve()
        })

        file.on('error', console.error)
      })

      request.on('error', console.error)
    })
  }

  public async updateSong(song: Song) {
    if (this.verifySong(song)) {
      const oldSong = this.getSongByOptions({ song: { _id: song._id } })[0]

      if (oldSong) {
        this.updateSongArtists(song.artists ?? [], oldSong.artists, song._id)
        this.updateSongAlbums(song.album ?? {}, oldSong.album, song._id)
        this.updateSongGenre(song.genre ?? [], oldSong.genre, song._id)
        const finalCoverPath = await this.getCoverPath(
          oldSong.song_coverPath_high ?? '',
          song.song_coverPath_high ?? '',
          song._id
        )
        song.song_coverPath_high = finalCoverPath
        song.song_coverPath_low = finalCoverPath

        this.db.updateWithBlackList('allsongs', song, ['_id = ?', song._id], ['_id'])
        this.updateAllSongCounts()
      } else {
        this.store(song)
      }
    }
  }

  /**
   * Search every entity for matching keyword
   * @param term term to search
   * @param exclude path to exclude from search
   * @returns SearchResult consisting of songs, albums, artists, genre
   */
  public searchAll(term: string, exclude?: string[]): SearchResult {
    const songs = this.getSongByOptions(
      {
        song: {
          title: term,
          path: term
        }
      },
      exclude
    )

    const albums = this.getEntityByOptions<Album>({
      album: {
        album_name: term
      }
    })

    const artists = this.getEntityByOptions<Artists>({
      artist: {
        artist_name: term
      }
    })

    const genre = this.getEntityByOptions<Genre>({
      genre: {
        genre_name: term
      }
    })

    return { songs: songs, albums: albums, artists: artists, genres: genre }
  }

  private getInnerKey(property: string) {
    if (property === 'extension') return 'provider_extension'
    return property
  }

  private populateWhereQuery(options?: SongAPIOptions) {
    if (options) {
      let where = 'WHERE '
      const args: string[] = []
      let isFirst = true

      const addANDorOR = () => {
        const str = !isFirst ? (options.inclusive ? 'AND' : 'OR') : ''
        isFirst = false
        return str
      }

      for (const [key] of Object.entries(options)) {
        if (key !== 'inclusive' && key !== 'sortBy') {
          const tableName = this.getTableByProperty(key as keyof SongAPIOptions)
          const data = options[key as keyof SongAPIOptions]
          if (data) {
            for (const [innerKey, innerValue] of Object.entries(data)) {
              where += `${addANDorOR()} ${tableName}.${this.getInnerKey(innerKey)} LIKE ?`
              args.push(`${innerValue}`)
            }
          }
        }
      }

      if (args.length === 0) {
        return { where: '', args: [] }
      }

      return { where, args }
    }
    return { where: '', args: [] }
  }

  private addOrderClause(sortBy?: SongSortOptions, noCase = false) {
    if (sortBy) {
      return `ORDER BY allsongs.${sortBy.type} ${noCase ? 'COLLATE NOCASE' : ''} ${sortBy.asc ? 'ASC' : 'DESC'}`
    }
    return ''
  }

  /**
   * Gets song by options
   * @param [options] SongAPIOptions to search by
   * @param [exclude] paths to exclude from result
   * @returns list of songs matching the query
   */
  public getSongByOptions(options?: SongAPIOptions, exclude?: string[]): Song[] {
    const { where, args } = this.populateWhereQuery(options)

    const songs: marshaledSong[] = this.db.query(
      `SELECT ${this.getSelectClause()}, ${this.addGroupConcatClause()} FROM allsongs
      ${this.addLeftJoinClause(undefined, 'allsongs')}
        ${where}
        ${this.addExcludeWhereClause(args.length === 0, exclude)} GROUP BY allsongs._id ${this.addOrderClause(
        options?.sortBy,
        args.length > 0
      )}`,
      ...args
    )

    return this.batchUnmarshal(songs)
  }

  private getTableByProperty(key: string) {
    switch (key) {
      case 'song':
        return 'allsongs'
      case 'album':
        return 'albums'
      case 'artist':
        return 'artists'
      case 'genre':
        return 'genre'
      case 'playlist':
        return 'playlists'
    }
  }

  private getTitleColByProperty(key: string) {
    switch (key) {
      case 'song':
        return 'title'
      case 'album':
        return 'album_name'
      case 'artist':
        return 'artist_name'
      case 'genre':
        return 'genre_name'
      case 'playlist':
        return 'playlist_name'
    }
  }

  /**
   * Get album, genre, playlist, artists by options
   * @param options EntityApiOptions to search by
   * @returns
   */
  public getEntityByOptions<T>(options: EntityApiOptions): T[] {
    let isFirst = true
    const addANDorOR = () => {
      const str = !isFirst ? (options.inclusive ? 'AND' : 'OR') : ''
      isFirst = false
      return str
    }

    let query = `SELECT * FROM `
    let where = `WHERE `
    const args = []
    let orderBy
    for (const [key, value] of Object.entries(options)) {
      const tableName = this.getTableByProperty(key as EntityKeys)
      if (tableName) {
        query += `${tableName} `
        orderBy = `${tableName}.${this.getTitleColByProperty(key as EntityKeys)}`

        if (typeof value === 'boolean' && value === true) {
          break
        }

        if (typeof value === 'object') {
          const data = options[key as keyof EntityApiOptions]
          if (data) {
            for (const [innerKey, innerValue] of Object.entries(data)) {
              where += `${addANDorOR()} ${innerKey} LIKE ?`
              args.push(innerValue)
            }
            break
          }
        }
      }
    }
    return (
      (this.db.query(`${query} ${args.length > 0 ? where : ''} ORDER BY ${orderBy} ASC`, ...args) as T[]) ?? []
    ).filter((val) => val)
  }

  /**
   * Get song matching the md5 hash
   * @param hash md5 hash
   * @returns Song
   */
  public getByHash(hash: string) {
    return this.getSongByOptions({
      song: {
        hash
      }
    })
  }

  /**
   * Update cover image of song by id
   * @param id id of song to update cover image
   * @param coverHigh high resolution cove image path
   * @param coverLow low resolution cove image path
   */
  public updateSongCover(id: string, coverHigh: string, coverLow?: string) {
    this.db.update(
      'allsongs',
      {
        song_coverPath_high: coverHigh,
        song_coverPath_low: coverLow
      },
      ['_id = ?', id]
    )
  }

  public updateSongLyrics(id: string, lyrics: string) {
    this.db.update(
      'allsongs',
      {
        lyrics
      },
      ['_id = ?', id]
    )
  }

  public getAllPaths(): string[] {
    return this.db.queryColumn('path', `SELECT path from allsongs`)
  }

  /* ============================= 
                ALBUMS
     ============================= */

  private storeAlbum(album: Album): string {
    let id: string | undefined
    if (album.album_name) {
      id = this.db.queryFirstCell(
        `SELECT album_id FROM albums WHERE album_name = ? COLLATE NOCASE`,
        album.album_name.trim()
      )
      if (!id) {
        id = v4()
        this.db.run(
          `INSERT INTO albums (album_id, album_name, album_coverPath_low, album_coverPath_high, album_artist) VALUES(?, ?, ?, ?, ?)`,
          id,
          album.album_name,
          album.album_coverPath_low,
          album.album_coverPath_high,
          album.album_artist
        )
      }
    }
    return id as string
  }

  /**
   * Updates album covers by song_id
   * @param songid id of the song belonging to the album whose cover is to be updated
   * @param coverHigh high resolution cover path
   * @param coverLow low resolution cover path
   */
  public updateAlbumCovers(songid: string, coverHigh: string, coverLow?: string) {
    this.db.transaction((songid, newHigh, newLow) => {
      const { album_id } = this.db.queryFirstRowObject(
        `SELECT album as album_id FROM album_bridge WHERE song = ?`,
        songid
      ) as { album_id: string }
      if (album_id) {
        const { high, low } = this.db.queryFirstRowObject(
          `SELECT album_coverPath_high as high, album_coverPath_low as low from albums WHERE album_id = ?`,
          album_id
        ) as { high: string; low: string }
        if (!high) {
          this.db.update('albums', { album_coverPath_high: newHigh }, ['album_id = ?', album_id])
        }

        if (!low) {
          this.db.update('albums', { album_coverPath_low: newLow }, ['album_id = ?', album_id])
        }
      }
    })(songid, coverHigh, coverLow)
  }

  public async updateAlbum(album: Album) {
    const oldAlbum = this.getEntityByOptions<Album>({
      album: {
        album_id: album.album_id
      }
    })[0]

    if (oldAlbum?.album_coverPath_high !== album.album_coverPath_high) {
      if (album.album_coverPath_high) {
        const coverPath = path.join(
          loadPreferences().thumbnailPath,
          album.album_id + path.extname(album.album_coverPath_high)
        )

        if (!album.album_coverPath_high.startsWith('http')) {
          await fsP.copyFile(album.album_coverPath_high, coverPath)
        } else {
          await this.downloadFile(album.album_coverPath_high, coverPath)
        }
        album.album_coverPath_high = coverPath
        album.album_coverPath_low = coverPath
      }

      if (oldAlbum?.album_coverPath_high) {
        await fsP.rm(oldAlbum?.album_coverPath_high, { force: true })
      }

      if (oldAlbum?.album_coverPath_low) {
        await fsP.rm(oldAlbum?.album_coverPath_low, { force: true })
      }
    }
    this.db.updateWithBlackList('albums', album, ['album_id = ?', album.album_id], ['album_id'])
  }

  /**
   * Updates song count of all albums
   */
  public updateSongCountAlbum() {
    this.db.transaction(() => {
      for (const row of this.db.query(`SELECT album_id FROM albums`)) {
        this.db.run(
          `UPDATE albums SET album_song_count = (SELECT count(id) FROM album_bridge WHERE album = ?) WHERE album_id = ?`,
          (row as Album).album_id,
          (row as Album).album_id
        )
      }
    })()
  }

  private storeAlbumBridge(albumID: string, songID: string) {
    if (albumID) {
      const exists = this.db.queryFirstCell(
        `SELECT COUNT(id) FROM album_bridge WHERE album = ? AND song = ?`,
        albumID,
        songID
      )
      if (exists === 0) {
        this.db.insert('album_bridge', { song: songID, album: albumID })
      }
    }
  }

  /* ============================= 
                GENRE
     ============================= */

  /**
   * Updates song count of all genres
   */
  public updateSongCountGenre() {
    this.db.transaction(() => {
      for (const row of this.db.query(`SELECT genre_id FROM genre`)) {
        this.db.run(
          `UPDATE genre SET genre_song_count = (SELECT count(id) FROM genre_bridge WHERE genre = ?) WHERE genre_id = ?`,
          (row as Genre).genre_id,
          (row as Genre).genre_id
        )
      }
    })()
  }

  private storeGenre(...genre: string[]) {
    const genreID: string[] = []
    if (genre) {
      for (const a of genre) {
        const id = this.db.queryFirstCell(`SELECT genre_id FROM genre WHERE genre_name = ? COLLATE NOCASE`, a)
        if (id) genreID.push(id)
        else {
          const id = v4()
          this.db.insert('genre', { genre_id: id, genre_name: a.trim() })
          genreID.push(id)
        }
      }
    }
    return genreID
  }

  private storeGenreBridge(genreID: string[], songID: string) {
    for (const i of genreID) {
      const exists = this.db.queryFirstCell(
        `SELECT COUNT(id) FROM genre_bridge WHERE genre = ? AND song = ?`,
        i,
        songID
      )
      if (exists === 0) {
        this.db.insert('genre_bridge', { song: songID, genre: i })
      }
    }
  }

  /* ============================= 
                ARTISTS
     ============================= */

  /**
   * Updates artists details
   * artist_id and artist_name are not updated
   * artist is queried by artist_id
   * @param artist artist with updated details.
   *
   * @returns number of rows updated
   */
  public async updateArtists(artist: Artists) {
    const oldArtist = this.getEntityByOptions<Artists>({
      artist: {
        artist_id: artist.artist_id
      }
    })[0]
    if (artist.artist_coverPath !== oldArtist?.artist_coverPath) {
      if (artist.artist_coverPath) {
        const coverPath = path.join(
          loadPreferences().thumbnailPath,
          artist.artist_id + path.extname(artist.artist_coverPath)
        )

        if (!artist.artist_coverPath.startsWith('http')) {
          await fsP.copyFile(artist.artist_coverPath, coverPath)
        } else {
          await this.downloadFile(artist.artist_coverPath, coverPath)
        }
        artist.artist_coverPath = coverPath
      }

      if (oldArtist?.artist_coverPath) {
        await fsP.rm(oldArtist.artist_coverPath, { force: true })
      }
    }
    this.db.updateWithBlackList('artists', artist, ['artist_id = ?', artist.artist_id], ['artist_id'])
  }

  private storeArtists(...artists: Artists[]): string[] {
    const artistID: string[] = []
    for (const a of artists) {
      if (a.artist_name) {
        const sanitizedName = sanitizeArtistName(a.artist_name, true)
        const id = this.db.queryFirstCell(
          `SELECT artist_id FROM artists WHERE artist_name = ? COLLATE NOCASE`,
          sanitizedName
        )
        if (id) artistID.push(id)
        else {
          const id = v4()
          this.db.insert('artists', { artist_id: id, artist_name: sanitizedName })
          artistID.push(id)
        }

        const existingArtist = this.db.queryFirstRow<Artists>(
          `SELECT * FROM artists WHERE artist_id = ? COLLATE NOCASE`,
          id
        )

        if (existingArtist) {
          if (a.artist_mbid) {
            if (!existingArtist.artist_mbid) {
              this.db.update('artists', a.artist_mbid, ['artist_id = ?', id])
            }

            if (!existingArtist.artist_coverPath && a.artist_coverPath) {
              this.db.update('artists', a.artist_coverPath, ['artist_id = ?', id])
            }
          }
        }
      }
    }
    return artistID
  }

  private storeArtistBridge(artistID: string[], songID: string) {
    for (const i of artistID) {
      const exists = this.db.queryFirstCell(
        `SELECT COUNT(id) FROM artists_bridge WHERE artist = ? AND song = ?`,
        i,
        songID
      )
      if (exists === 0) {
        this.db.insert('artists_bridge', { song: songID, artist: i })
      }
    }
  }

  /**
   * Gets default cover for artist
   * Queries the albums belonging to songs by the artist for cover image
   * @param id of artist whose default cover image is required
   * @returns high resolution cover image for artist
   */
  public getDefaultCoverByArtist(id: string) {
    const album_cover = (
      this.db.queryFirstRow(
        `SELECT album_coverPath_high from albums WHERE album_id = (SELECT album FROM album_bridge WHERE song = (SELECT song FROM artists_bridge WHERE artist = ?))`,
        id
      ) as marshaledSong
    )?.album_coverPath_high

    if (album_cover) {
      return album_cover
    }

    const song_cover = this.db.queryFirstRow(
      `SELECT song_coverPath_high from allsongs WHERE _id = (SELECT song FROM artists_bridge WHERE artist = ?)`,
      id
    )?.song_coverPath_high

    return song_cover
  }

  /**
   * Updates song count of all genres
   */
  public updateSongCountArtists() {
    this.db.transaction(() => {
      for (const row of this.db.query(`SELECT artist_id FROM artists`)) {
        this.db.run(
          `UPDATE artists SET artist_song_count = (SELECT count(id) FROM artists_bridge WHERE artist = ?) WHERE artist_id = ?`,
          (row as Artists).artist_id,
          (row as Artists).artist_id
        )
      }
    })()
  }

  /* ============================= 
                PLAYLISTS
     ============================= */

  /**
   * Creates playlist
   * @param name name of playlist
   * @param desc description of playlist
   * @param imgSrc cover image of playlist
   * @returns playlist id after creation
   */
  public createPlaylist(playlist: Partial<Playlist>, extension?: string): string {
    const id = `${extension ? extension + ':' : ''}${playlist.playlist_id ?? v4()}`
    this.db.insert('playlists', {
      ...playlist,
      playlist_name: playlist.playlist_name ?? 'New Playlist',
      playlist_id: id,
      playlist_song_count: playlist.playlist_song_count ?? 0
    })
    return id
  }

  public getPlaylistByPath(filePath: string) {
    return this.getEntityByOptions({
      playlist: {
        playlist_path: filePath
      }
    }) as Playlist[]
  }

  public async updatePlaylist(playlist: Partial<Playlist>) {
    const oldPlaylist = this.getEntityByOptions<Playlist>({ playlist: { playlist_id: playlist.playlist_id } })[0]
    if (oldPlaylist?.playlist_coverPath !== playlist.playlist_coverPath) {
      if (playlist.playlist_coverPath) {
        const coverPath = path.join(
          loadPreferences().thumbnailPath,
          playlist.playlist_id + path.extname(playlist.playlist_coverPath)
        )

        if (!playlist.playlist_coverPath.startsWith('http')) {
          await fsP.copyFile(playlist.playlist_coverPath, coverPath)
        } else {
          await this.downloadFile(playlist.playlist_coverPath, coverPath)
        }
        playlist.playlist_coverPath = coverPath
      }

      if (oldPlaylist?.playlist_coverPath) {
        await fsP.rm(oldPlaylist.playlist_coverPath, { force: true })
      }
    }

    this.db.updateWithBlackList('playlists', playlist, ['playlist_id = ?', playlist.playlist_id], ['playlist_id'])
  }

  /**
   * Updates playlist cover path
   * @param playlist_id id of playlist whose cover is to be updated
   * @param coverPath hig resolution cover path
   */
  public updatePlaylistCoverPath(playlist_id: string, coverPath: string) {
    this.db.update('playlists', { playlist_coverPath: coverPath }, ['playlist_id = ?', playlist_id])
  }

  private isPlaylistCoverExists(playlist_id: string) {
    return !!(
      this.db.query(`SELECT playlist_coverPath FROM playlists WHERE playlist_id = ?`, playlist_id)[0] as Playlist
    )?.playlist_coverPath
  }

  /**
   * Adds songs to playlist
   * @param playlist_id id of playlist where songs are to be added
   * @param songs songs which are to be added to playlist
   */
  public addToPlaylist(playlist_id: string, ...songs: Song[]) {
    // TODO: Regenerate cover instead of using existing from song
    const coverExists = this.isPlaylistCoverExists(playlist_id)
    this.db.transaction((songs: Song[]) => {
      for (const s of songs) {
        if (!coverExists) {
          if (s.album?.album_coverPath_high) {
            this.updatePlaylistCoverPath(playlist_id, s.album.album_coverPath_high)
          }
        }
        this.db.insert('playlist_bridge', { playlist: playlist_id, song: s._id })
      }
    })(songs)
    this.updateSongCountPlaylists()
  }

  /**
   * Removes song from playlist
   * @param playlist id of playlist from which song is to be removed
   * @param songs songs which are to be removed
   */
  public async removeFromPlaylist(playlist: string, ...songs: string[]) {
    this.db.transaction((songs: string[]) => {
      for (const s in songs) {
        this.db.delete('playlist_bridge', { playlist: playlist, song: s })
      }
    })(songs)
    this.updateSongCountPlaylists()
  }

  /**
   * Updates song count of all playlists
   */
  public updateSongCountPlaylists() {
    this.db.transaction(() => {
      for (const row of this.db.query(`SELECT playlist_id FROM playlists`)) {
        this.db.run(
          `UPDATE playlists SET playlist_song_count = (SELECT count(id) FROM playlist_bridge WHERE playlist = ?) WHERE playlist_id = ?`,
          (row as Playlist).playlist_id,
          (row as Playlist).playlist_id
        )
      }
    })()
  }

  /**
   * Removes playlist
   * @param playlist_id id of playlist to be removed
   */
  public async removePlaylist(playlist_id: string) {
    this.db.delete('playlist_bridge', { playlist: playlist_id })
    this.db.delete('playlists', { playlist_id: playlist_id })
  }
}
