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
import { getSongDB } from '@/utils/main/db/index'
import fs from 'fs'
import { getCombinedMusicPaths, loadPreferences } from '@/utils/main/db/preferences'
import { access, mkdir } from 'fs/promises'

// @ts-expect-error it don't want .ts
import scannerWorker from 'threads-plugin/dist/loader?name=0!/src/utils/main/workers/scanner.ts'
// @ts-expect-error it don't want .ts
import scraperWorker from 'threads-plugin/dist/loader?name=1!/src/utils/main/workers/scraper.ts'
// @ts-expect-error it don't want .ts
import coverWorker from 'threads-plugin/dist/loader?name=2!/src/utils/main/workers/covers.ts'
import { WindowHandler } from '../windowManager'
import { v4 } from 'uuid'
import path from 'path'
import { isEmpty } from '@/utils/common'
import { loadSelectivePreference } from '../db/preferences'

const loggerPath = app.getPath('logs')

enum scanning {
  UNDEFINED,
  SCANNING,
  QUEUED
}

type ScanWorker = Awaited<ReturnType<typeof spawn<ScanWorkerWorkerType>>>

type ScannedSong = { song: Song; cover: undefined | TransferDescriptor<Buffer> }
type ScannedPlaylist = { filePath: string; title: string; songHashes: string[] }

export class ScannerChannel implements IpcChannelInterface {
  name = IpcEvents.SCANNER
  private scanStatus: scanning = scanning.UNDEFINED

  private scannerWorker: ScanWorker | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private scraperWorker: any

  private totalScanFiles = 0
  private currentScanFile = 0

  handle(event: IpcMainEvent, request: IpcRequest) {
    switch (request.type) {
      case ScannerEvents.SCAN_MUSIC:
        this.scanAll(event, request as IpcRequest<ScannerRequests.ScanSongs>)
        break
      case ScannerEvents.SCAN_SINGLE_SONG:
        this.scanSingleSong(event, request as IpcRequest<ScannerRequests.ScanSingleSong>)
        break
      case ScannerEvents.GET_COVER_BY_HASH:
        this.getCoverByHash(event, request as IpcRequest<ScannerRequests.GetCoverByHash>)
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
    if (song.hash) {
      const existing = getSongDB().getByHash(song.hash)
      if (existing.length === 0) {
        const res = cover && (await this.storeCover(cover, song.hash))
        if (res) {
          song.album = {
            ...song.album,
            album_coverPath_high: res.high,
            album_coverPath_low: res.low
          }
          song.song_coverPath_high = res.high
          song.song_coverPath_low = res.low
        }

        getSongDB().store(song)
      } else {
        const s = existing[0]
        const albumCoverExists = await this.checkAlbumCovers(s)
        const songCoverExists = await this.checkSongCovers(s)

        if (!albumCoverExists || !songCoverExists) {
          const res = cover && (await this.storeCover(cover, song.hash))
          if (res) {
            if (!songCoverExists) getSongDB().updateSongCover(s._id, res.high, res.low)
            if (!albumCoverExists) getSongDB().updateAlbumCovers(s._id, res.high, res.low)
          }
        }
      }
    }
  }

  private isWritingCover: Record<string, Promise<{ high: string; low?: string }>> = {}

  private async storeCover(cover: TransferDescriptor<Buffer> | undefined, hash: string) {
    if (cover) {
      const thumbPath = loadPreferences().thumbnailPath
      try {
        await access(thumbPath)
      } catch (e) {
        await mkdir(thumbPath, { recursive: true })
      }

      try {
        const ret = new Promise<SavedCovers>((resolve, reject) => {
          console.debug('Storing cover for hash', hash)
          spawn<CoverWorkerType>(new Worker(`./${coverWorker}`), { timeout: 5000 }).then((coverWorker) => {
            coverWorker.writeBuffer(cover, thumbPath, hash, false).subscribe((val) => {
              console.debug('Stored cover for hash', hash)
              resolve(val)
            }, reject)
          })
        })

        this.isWritingCover[hash] = ret
        return await ret
      } catch (e) {
        console.error('Error writing cover', e)
      }
    }
  }

  private storePlaylist(playlist: ScannedPlaylist) {
    const existing = getSongDB().getPlaylistByPath(playlist.filePath)[0]
    const songs: Song[] = []
    for (const h of playlist.songHashes) {
      songs.push(...getSongDB().getByHash(h))
    }

    if (songs.length > 0) {
      if (!existing) {
        console.debug('Storing scanned playlist', playlist)
        const id = getSongDB().createPlaylist({
          playlist_name: playlist.title,
          playlist_path: playlist.filePath
        })
        getSongDB().addToPlaylist(id, ...songs)
      } else {
        const playlistSongs = getSongDB().getSongByOptions({ playlist: { playlist_id: existing.playlist_id } })
        console.debug('Found existing playlist, updating')
        for (const s of songs) {
          if (playlistSongs.findIndex((val) => val._id === s._id) === -1) {
            getSongDB().addToPlaylist(existing.playlist_id, s)
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

  private scanSongs(paths: togglePaths, splitPattern: string, forceScan = false) {
    return new Promise<void>((resolve, reject) => {
      this.scannerWorker?.start(paths, forceScan ? [] : getSongDB().getAllPaths(), loggerPath, splitPattern).subscribe(
        (result) => {
          if (this.isProgress(result)) {
            this.totalScanFiles = result.total
            this.currentScanFile = result.current

            this.updateProgress()
          }

          if (this.isScannedSong(result)) {
            this.checkDuplicateAndStore(result.song, result.cover)
          }

          if (this.isScannedPlaylist(result)) {
            this.storePlaylist(result)
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
            await getSongDB().updateArtists(result)
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
    if (cover) {
      ret.artist_coverPath = cover
    } else {
      console.debug('Getting default cover for', artist.artist_name)
      ret.artist_coverPath = await getSongDB().getDefaultCoverByArtist(artist.artist_id)
    }

    await getSongDB().updateArtists(ret)
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
    const allSongs = getSongDB().getSongByOptions()
    const excludePaths = paths.filter((val) => !val.enabled).map((val) => val.path)
    const excludeRegex = new RegExp(excludePaths.length > 0 ? excludePaths.join('|').replaceAll('\\', '\\\\') : /(?!)/)

    const toRemove: Song[] = []
    for (const s of allSongs) {
      if (s.type == 'LOCAL') {
        if (paths.length == 0 || !s.path || s.path?.match(excludeRegex)) {
          toRemove.push(s)
          continue
        }

        try {
          await fs.promises.access(s.path, fs.constants.F_OK)
        } catch (e) {
          toRemove.push(s)
        }
      }
    }

    await getSongDB().removeSong(...toRemove)
    if (toRemove.length === 0) {
      await getSongDB().cleanDb()
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

    const allArtists = getSongDB().getEntityByOptions<Artists>({
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

    if (this.scannerWorker) {
      await Thread.terminate(this.scannerWorker)
      this.scannerWorker = undefined
    }

    try {
      this.scannerWorker = await spawn<ScanWorkerWorkerType>(new Worker(`./${scannerWorker}`), { timeout: 5000 })
    } catch (e) {
      console.error('Error Spawning', scannerWorker, e)
      event?.reply(request?.responseChannel)
      return
    }

    const scanPaths = getCombinedMusicPaths()
    const splitPattern = loadSelectivePreference<string>('scan_splitter')

    if (scanPaths) {
      try {
        await this.scanSongs(scanPaths, splitPattern ?? '', request?.params.forceScan)
      } catch (e) {
        console.error(e)
      }

      console.debug('Scan complete')

      this.setIdle()

      if (this.scannerWorker) {
        Thread.terminate(this.scannerWorker)
        this.scannerWorker = undefined
      }

      if (this.isScanQueued()) {
        await this.scanAll(event, request)
      }

      console.debug('Starting destructive scan')
      await this.destructiveScan(scanPaths)
    }

    // Run scraping task only if all subsequent scanning tasks are completed
    // And if no other scraping task is ongoing
    if (!this.isScanning && !this.scraperWorker) {
      await this.scrapeArtists()
    }

    if (event && request) event.reply(request.responseChannel)
  }

  private isScannedSong(item: ScannedSong | ScannedPlaylist | Progress): item is ScannedSong {
    return !isEmpty((item as ScannedSong).song)
  }

  private isScannedPlaylist(item: ScannedSong | ScannedPlaylist | Progress): item is ScannedPlaylist {
    return !(isEmpty((item as ScannedPlaylist).filePath) || isEmpty((item as ScannedPlaylist).songHashes))
  }

  private isProgress(item: ScannedSong | ScannedPlaylist | Progress): item is Progress {
    return !isEmpty((item as Progress).total)
  }

  private async scanSinglePlaylist(event: IpcMainEvent, request: IpcRequest<ScannerRequests.ScanSinglePlaylist>) {
    if (request.params.playlistPath) {
      try {
        // Don't use global scan worker since this method should not wait for full scan to complete
        const scanWorker = await spawn<ScanWorkerWorkerType>(new Worker(`./${scannerWorker}`), { timeout: 5000 })
        const splitPattern = loadSelectivePreference<string>('scan_splitter')

        const songs: Song[] = []
        let playlist: Partial<Playlist> | null = null

        scanWorker.scanSinglePlaylist(request.params.playlistPath, loggerPath, splitPattern ?? '').subscribe(
          (result) => {
            if (this.isScannedSong(result)) {
              songs.push(result.song)
            }

            if (this.isScannedPlaylist(result)) {
              playlist = {
                playlist_id: v4(),
                playlist_name: result.title,
                playlist_path: result.filePath
              }

              console.debug('Got playlist', playlist.playlist_name)
            }
          },
          console.error,
          () => event.reply(request.responseChannel, { playlist, songs })
        )

        await Thread.terminate(scanWorker)
      } catch (e) {
        console.error('Error Spawning', scannerWorker, e)
        event.reply(request.responseChannel)
        return
      }
    }
  }

  private async getCoverByHash(event: IpcMainEvent, request: IpcRequest<ScannerRequests.GetCoverByHash>) {
    if (request.params.hash) {
      if (Object.keys(this.isWritingCover).includes(request.params.hash)) {
        event.reply(request.responseChannel, await this.isWritingCover[request.params.hash])
      }

      const thumbPath = loadPreferences().thumbnailPath
      const coverPathHigh = path.join(thumbPath, `${request.params.hash}-high.jpg`)
      const coverPathLow = path.join(thumbPath, `${request.params.hash}-high.jpg`)
      const ret: { high?: string; low?: string } = {}
      try {
        await access(coverPathHigh)
        ret.high = coverPathHigh
      } catch (e) {
        console.warn('High res coverpath not found for', request.params.hash)
      }

      try {
        await access(coverPathLow)
        ret.low = coverPathLow
      } catch (e) {
        console.warn('Low res coverpath not found for', request.params.hash)
      }

      event.reply(request.responseChannel, ret)
    }
  }

  private async scanSingleSong(event: IpcMainEvent, request: IpcRequest<ScannerRequests.ScanSingleSong>) {
    if (request.params.songPath) {
      try {
        let song: Song | undefined = undefined
        // Don't use global scan worker since this method should not wait for full scan to complete
        const singleScanWorker = await spawn<ScanWorkerWorkerType>(new Worker(`./${scannerWorker}`), { timeout: 5000 })
        const splitPattern = loadSelectivePreference<string>('scan_splitter')

        singleScanWorker.scanSingleSong(request.params.songPath, loggerPath, splitPattern ?? '').subscribe(
          (result) => {
            if (this.isScannedSong(result)) {
              song = result.song
              if (result.cover && song.hash) {
                this.storeCover(result.cover, song.hash)
              }
            }
          },
          console.error,
          () => {
            event.reply(request.responseChannel, { song })
          }
        )
      } catch (e) {
        console.error('Error Spawning', scannerWorker, e)
        event.reply(request?.responseChannel)
        return
      }
    }
  }
}
