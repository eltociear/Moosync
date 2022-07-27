/*
 *  scanner.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { IpcEvents, ScannerEvents } from './constants'
import { Thread, TransferDescriptor, Worker, spawn } from 'threads'

import { IpcMainEvent, app } from 'electron'
import { SongDB } from '@/utils/main/db/index'
import fs from 'fs'
import { loadPreferences } from '@/utils/main/db/preferences'
import { notifyRenderer } from '.'
import { writeBuffer } from '@/utils/main/workers/covers'
import { access, mkdir } from 'fs/promises'

// @ts-expect-error it don't want .ts
import scannerWorker from 'threads-plugin/dist/loader?name=0!/src/utils/main/workers/scanner.ts'
// @ts-expect-error it don't want .ts
import scraperWorker from 'threads-plugin/dist/loader?name=1!/src/utils/main/workers/scraper.ts'
import { Observable } from 'observable-fns'
import { WindowHandler } from '../windowManager'
import { v4 } from 'uuid'
import path from 'path'

const loggerPath = app.getPath('logs')

enum scanning {
  UNDEFINED,
  SCANNING,
  QUEUED
}

type ScannedSong = { song: Song; cover: undefined | TransferDescriptor<Buffer> }
type ScannedPlaylist = { filePath: string; title: string; songHashes: string[] }

export class ScannerChannel implements IpcChannelInterface {
  name = IpcEvents.SCANNER
  private scanStatus: scanning = scanning.UNDEFINED

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scannerWorker: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scraperWorker: any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private singleScannerWorker: any

  private totalScanFiles = 0
  private currentScanFile = 0

  handle(event: IpcMainEvent, request: IpcRequest) {
    switch (request.type) {
      case ScannerEvents.SCAN_MUSIC:
        this.scanAll(event, request as IpcRequest<ScannerRequests.ScanSongs>)
        break
      case ScannerEvents.GET_PROGRESS:
        this.getScanProgress(event, request)
        break
      case ScannerEvents.SCAN_SINGLE_PLAYLIST:
        this.scanSinglePlaylist(event, request as IpcRequest<ScannerRequests.ScanSinglePlaylist>)
        break
    }
  }

  private async getScanProgress(event: IpcMainEvent, request: IpcRequest) {
    event.reply(request.responseChannel, {
      status: this.scanStatus,
      total: this.totalScanFiles,
      current: this.currentScanFile
    })
  }

  private async checkAlbumCovers(song: Song | undefined) {
    return (
      (await this.checkCoverExists(song?.album?.album_coverPath_low)) &&
      (await this.checkCoverExists(song?.album?.album_coverPath_high))
    )
  }

  private async checkSongCovers(song: Song | undefined) {
    return (
      (await this.checkCoverExists(song?.song_coverPath_high)) &&
      (await this.checkCoverExists(song?.song_coverPath_low))
    )
  }

  private async checkDuplicateAndStore(song: Song, cover: TransferDescriptor<Buffer> | undefined) {
    notifyRenderer({ id: 'scan-status', message: `Scanned ${song.title}`, type: 'info' })

    if (song.hash) {
      const existing = SongDB.getByHash(song.hash)
      if (existing.length === 0) {
        const res = cover && (await this.storeCover(cover))
        if (res) {
          song.album = {
            ...song.album,
            album_coverPath_high: res.high,
            album_coverPath_low: res.low
          }
          song.song_coverPath_high = res.high
          song.song_coverPath_low = res.low
        }

        SongDB.store(song)
      } else {
        const s = existing[0]
        const albumCoverExists = await this.checkAlbumCovers(s)
        const songCoverExists = await this.checkSongCovers(s)

        if (!albumCoverExists || !songCoverExists) {
          const res = cover && (await this.storeCover(cover))
          if (res) {
            if (!songCoverExists) SongDB.updateSongCover(s._id, res.high, res.low)
            if (!albumCoverExists) SongDB.updateAlbumCovers(s._id, res.high, res.low)
          }
        }
      }
    }
  }

  private async storeCover(cover: TransferDescriptor<Buffer> | undefined) {
    if (cover) {
      const thumbPath = loadPreferences().thumbnailPath
      try {
        await access(thumbPath)
      } catch (e) {
        await mkdir(thumbPath, { recursive: true })
      }

      try {
        return writeBuffer(cover.send, thumbPath)
      } catch (e) {
        console.error('Error writing cover', e)
      }
    }
  }

  private storePlaylist(playlist: ScannedPlaylist) {
    const existing = SongDB.getPlaylistByPath(playlist.filePath)[0]
    const songs: Song[] = []
    for (const h of playlist.songHashes) {
      songs.push(...SongDB.getByHash(h))
    }

    if (songs.length > 0) {
      if (!existing) {
        console.debug('Storing scanned playlist', playlist)
        const id = SongDB.createPlaylist({
          playlist_name: playlist.title,
          playlist_path: playlist.filePath
        })
        SongDB.addToPlaylist(id, ...songs)
      } else {
        const playlistSongs = SongDB.getSongByOptions({ playlist: { playlist_id: existing.playlist_id } })
        console.debug('Found existing playlist, updating')
        for (const s of songs) {
          if (playlistSongs.findIndex((val) => val._id === s._id) === -1) {
            SongDB.addToPlaylist(existing.playlist_id, s)
          }
        }
      }
    }
  }

  private updateProgress() {
    WindowHandler.getWindow(false)?.webContents.send(ScannerEvents.PROGRESS_CHANNEL, {
      current: this.currentScanFile,
      total: this.totalScanFiles,
      status: this.scanStatus
    } as Progress)
  }

  private scanSongs(preferences: Preferences, forceScan = false) {
    return new Promise<void>((resolve, reject) => {
      ;(
        this.scannerWorker.start(
          preferences.musicPaths,
          forceScan ? [] : SongDB.getAllPaths(),
          loggerPath
        ) as Observable<ScannedSong | ScannedPlaylist | Progress>
      ).subscribe(
        (result) => {
          if ((result as Progress).total) {
            this.totalScanFiles = (result as Progress).total
            this.currentScanFile = (result as Progress).current

            this.updateProgress()
          }

          if ((result as ScannedSong).song) {
            this.checkDuplicateAndStore((result as ScannedSong).song, (result as ScannedSong).cover)
          }

          if ((result as ScannedPlaylist).filePath && (result as ScannedPlaylist).songHashes) {
            this.storePlaylist(result as ScannedPlaylist)
          }
        },
        reject,
        resolve
      )
    })
  }

  private fetchMBID(allArtists: Artists[]) {
    const pendingPromises: Promise<void>[] = []
    return new Promise<void>((resolve, reject) => {
      this.scraperWorker.fetchMBID(allArtists, loggerPath).subscribe(
        async (result: Artists) => {
          if (result) {
            await SongDB.updateArtists(result)
            pendingPromises.push(this.fetchArtworks([result]))
          }
        },
        (err: Error) => {
          reject(err)
        },
        () => {
          Promise.all(pendingPromises).then(() => resolve())
        }
      )
    })
  }

  private async updateArtwork(artist: Artists, cover: string | undefined) {
    const ret: Artists = artist
    notifyRenderer({ id: 'artwork-status', message: `Found artwork for ${artist.artist_name}`, type: 'info' })
    if (cover) {
      ret.artist_coverPath = cover
    } else {
      console.debug('Getting default cover for', artist.artist_name)
      ret.artist_coverPath = await SongDB.getDefaultCoverByArtist(artist.artist_id)
    }

    await SongDB.updateArtists(ret)
  }

  private async fetchArtworks(allArtists: Artists[]) {
    return new Promise<void>((resolve) => {
      this.scraperWorker.fetchArtworks(allArtists, loggerPath).subscribe(
        (result: { artist: Artists; cover: string | undefined }) => this.updateArtwork(result.artist, result.cover),
        console.error,
        () => resolve()
      )
    })
  }

  private async checkCoverExists(coverPath: string | undefined): Promise<boolean> {
    if (coverPath && !coverPath.startsWith('http')) {
      coverPath = decodeURIComponent(coverPath)
      try {
        await fs.promises.access(coverPath)
        return true
      } catch (e) {
        console.warn(`${coverPath} not accessible`)
        await fs.promises.mkdir(path.dirname(coverPath), { recursive: true })
      }
    }
    return false
  }

  private async destructiveScan(paths: togglePaths) {
    const allSongs = SongDB.getSongByOptions()
    const regex = new RegExp(paths.map((val) => val.path).join('|'))
    for (const s of allSongs) {
      if (s.type == 'LOCAL') {
        if (paths.length == 0 || !(s.path && s.path.match(regex)) || !s.path) {
          await SongDB.removeSong(s._id)
          continue
        }

        try {
          await fs.promises.access(s.path, fs.constants.F_OK)
        } catch (e) {
          await SongDB.removeSong(s._id)
        }
      }
    }
  }

  private async scrapeArtists() {
    console.debug('Scraping artists')
    try {
      this.scraperWorker = await spawn(new Worker(`./${scraperWorker}`), { timeout: 5000 })
    } catch (e) {
      console.error('Error spawning', scraperWorker, e)
      return
    }

    const allArtists = SongDB.getEntityByOptions<Artists>({
      artist: true
    })

    console.info('Fetching MBIDs for Artists')
    await this.fetchMBID(allArtists)

    await Thread.terminate(this.scraperWorker)
    console.debug('Terminated scraper thread')
    this.scraperWorker = undefined
  }

  get isScanning() {
    return this.scanStatus == scanning.SCANNING || this.scanStatus == scanning.QUEUED
  }

  private isScanQueued() {
    return this.scanStatus == scanning.QUEUED
  }

  private setScanning() {
    this.scanStatus = scanning.SCANNING
  }

  private setIdle() {
    this.scanStatus = scanning.UNDEFINED
    this.currentScanFile = 0
    this.totalScanFiles = 0

    this.updateProgress()
  }

  private setQueued() {
    this.scanStatus = scanning.QUEUED
  }

  public async scanAll(event?: IpcMainEvent, request?: IpcRequest<ScannerRequests.ScanSongs>) {
    if (this.isScanning) {
      this.setQueued()
      return
    }
    this.setScanning()

    const preferences = loadPreferences()
    notifyRenderer({ id: 'started-scan', message: 'Starting scanning files', type: 'info' })

    if (this.scannerWorker) {
      await Thread.terminate(this.scannerWorker)
      this.scannerWorker = undefined
    }

    try {
      this.scannerWorker = await spawn(new Worker(`./${scannerWorker}`), { timeout: 5000 })
    } catch (e) {
      console.error('Error Spawning', scannerWorker, e)
      event?.reply(request?.responseChannel, e)
      return
    }

    await this.destructiveScan(preferences.musicPaths)

    try {
      await this.scanSongs(preferences, request?.params.forceScan)
    } catch (e) {
      console.error(e)
    }

    console.debug('Scan complete')

    this.setIdle()

    Thread.terminate(this.scannerWorker)
    this.scannerWorker = undefined

    notifyRenderer({ id: 'completed-scan', message: 'Scanning Completed', type: 'info' })

    if (this.isScanQueued()) {
      await this.scanAll(event, request)
    }

    // Run scraping task only if all subsequent scanning tasks are completed
    // And if no other scraping task is ongoing
    if (!this.isScanning && !this.scraperWorker) {
      await this.scrapeArtists()
    }

    if (event && request) event.reply(request.responseChannel)
  }

  private async scanSinglePlaylist(event: IpcMainEvent, request: IpcRequest<ScannerRequests.ScanSinglePlaylist>) {
    if (request.params.playlistPath) {
      if (this.singleScannerWorker) {
        await Thread.terminate(this.singleScannerWorker)
        this.singleScannerWorker = undefined
      }

      try {
        this.singleScannerWorker = await spawn(new Worker(`./${scannerWorker}`), { timeout: 5000 })
      } catch (e) {
        console.error('Error Spawning', scannerWorker, e)
        event.reply(request.responseChannel, e)
        return
      }

      const songs: Song[] = []
      let playlist: Partial<Playlist> | null = null
      ;(
        this.singleScannerWorker.scanSinglePlaylist(request.params.playlistPath, loggerPath) as Observable<
          ScannedSong | ScannedPlaylist | Progress
        >
      ).subscribe(
        (result) => {
          if ((result as ScannedSong).song) {
            songs.push((result as ScannedSong).song)
          }

          if ((result as ScannedPlaylist).filePath && (result as ScannedPlaylist).songHashes) {
            playlist = {
              playlist_id: v4(),
              playlist_name: (result as ScannedPlaylist).title,
              playlist_path: (result as ScannedPlaylist).filePath
            }

            console.debug('Got playlist', playlist.playlist_name)
          }
        },
        console.error,
        () => event.reply(request.responseChannel, { playlist, songs })
      )
    }
  }
}
