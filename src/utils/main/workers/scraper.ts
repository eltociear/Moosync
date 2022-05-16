/*
 *  scraper.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Observable, SubscriptionObserver } from 'observable-fns'
import { expose } from 'threads/worker'

import axios from 'axios'
import axiosRetry from 'axios-retry'
import { createHash } from 'crypto'
import fs from 'fs'
import rateLimit from 'axios-rate-limit'
import { getLogger, levels } from 'loglevel'
import { prefixLogger } from '../logger/utils'
import { sanitizeArtistName } from '@/utils/common'

const logger = getLogger('ScrapeWorker')
logger.setLevel(process.env.DEBUG_LOGGING ? levels.DEBUG : levels.INFO)

expose({
  fetchMBID(artists: Artists[], loggerPath: string) {
    return new Observable((observer) => {
      prefixLogger(loggerPath, logger)
      fetchMBID(artists, observer)
    })
  },

  fetchArtworks(artists: Artists[], loggerPath: string) {
    return new Observable((observer) => {
      prefixLogger(loggerPath, logger)
      fetchArtworks(artists, observer)
    })
  }
})

axios.defaults.timeout = 3000

// const coverPath: string
const musicbrainz = rateLimit(
  axios.create({
    baseURL: 'https://musicbrainz.org/ws/2/artist/',
    headers: { 'User-Agent': 'moosync/' + process.env.MOOSYNC_VERSION.toString() + ' (ovenoboyo@gmail.com)' },
    timeout: 3000
  }),
  {
    maxRequests: 1,
    perMilliseconds: 1250
  }
)

axiosRetry(axios, {
  retryDelay: (retryCount) => {
    return retryCount * 1000
  },
  retries: 3
})

async function queryMbid(name: string) {
  return musicbrainz.get(
    encodeURI(`/?limit=1&query=artist:${sanitizeArtistName(name).replaceAll(' ', '%20').replaceAll('.', '')}`)
  )
}

async function getAndUpdateMBID(a: Artists): Promise<Artists | undefined> {
  if (a.artist_name) {
    const data = await queryMbid(a.artist_name)
    if (data.data && data.data.artists.length > 0 && data.data.artists[0].id) {
      return { artist_id: a.artist_id, artist_mbid: data.data.artists[0].id, artist_name: a.artist_name }
    }
  }
}

export async function fetchMBID(artists: Artists[], observer: SubscriptionObserver<Artists | undefined>) {
  logger.debug('Total artists', artists.length)
  for (const a of artists) {
    if (!a.artist_mbid) {
      logger.debug('Fetching MBID for', a.artist_name)
      const updated = await getAndUpdateMBID(a)
      logger.debug('Got MBID for', a.artist_name, 'as', updated?.artist_mbid)
      observer.next(updated)
    }
  }
  logger.debug('Finished fetching MBID')
  observer.complete()
}

async function queryArtistUrls(id: string) {
  try {
    const data = await musicbrainz.get(encodeURI(`/${id}?inc=url-rels`))
    return data
  } catch (e) {
    logger.debug('MusicBrainz fetch failed', e)
  }
}

async function fetchImagesRemote(a: Artists) {
  if (a.artist_mbid) {
    logger.debug('Fetching urls from MusicBrainz for', a.artist_name)
    const data = await queryArtistUrls(a.artist_mbid)
    if (data && data.data.relations) {
      for (const r of data.data.relations) {
        if (r.type == 'image') {
          logger.info('Found artwork for', a.artist_name, 'on MusicBrainz')
          return downloadImage(r.url.resource)
        }
      }
    }

    logger.debug('Failed to fetch artwork from MusicBrainz for', a.artist_name)

    const url = await fetchFanartTv(a.artist_mbid)
    if (url) {
      logger.info('Found artwork for', a.artist_name, 'on FanartTv')
      return downloadImage(url)
    }

    logger.debug('Failed to fetch artwork from FanArtTV for', a.artist_name)
  }

  if (a.artist_name) {
    const url = await fetchTheAudioDB(a.artist_name)
    if (url) {
      logger.info('Found artwork for', a.artist_name, 'on TheAudioDB')
      return downloadImage(url)
    }

    logger.debug('Failed to fetch artwork from TheAudioDB for', a.artist_name)
  }
}

async function fetchTheAudioDB(artist_name: string) {
  try {
    const data = await axios.get(
      encodeURI(`https://www.theaudiodb.com/api/v1/json/2/search.php?s=${artist_name.replaceAll(' ', '%20')}`)
    )
    if (data.data && data.data.artists && data.data.artists.length > 0) {
      for (const art in data.data.artists[0]) {
        if (art.includes('strArtistThumb') || art.includes('strArtistFanart')) {
          if (data.data.artists[0][art]) {
            return data.data.artists[0][art]
          }
        }
      }
    }
  } catch (e) {
    logger.debug('TheAudioDB fetch failed', e)
  }
}

async function fetchFanartTv(mbid: string): Promise<string | undefined> {
  try {
    const data = await axios.get(
      encodeURI(`http://webservice.fanart.tv/v3/music/${mbid}?api_key=68746a37e506c5fe70c80e13dc84d8b2`)
    )
    if (data.data) {
      return data.data.artistthumb ? data.data.artistthumb[0].url : undefined
    }
  } catch (e) {
    logger.debug('FanartTV fetch failed', (e as Error).message)
  }
}

async function followWikimediaRedirects(fileName: string): Promise<string | undefined> {
  try {
    const data = (
      await axios.get(
        encodeURI(`https://commons.wikimedia.org/w/api.php?action=query&redirects=1&titles=${fileName}&format=json`)
      )
    ).data.query
    let filename = ''
    for (const i in data.pages) {
      filename = data.pages[i].title.replace('File:', '').replaceAll(/\s+/g, '_')
      break
    }
    if (filename) {
      const md5 = createHash('md5').update(filename).digest('hex')
      return encodeURI(`https://upload.wikimedia.org/wikipedia/commons/${md5[0]}/${md5[0] + md5[1]}/${filename}`)
    }
  } catch (e) {
    logger.debug('Failed to follow wikimedia redirects', e)
  }

  return undefined
}

async function parseScrapeUrl(url: string) {
  logger.debug('Parsing scrape URL', url)

  const parsed = new URL(url)
  switch (parsed.hostname) {
    case 'commons.wikimedia.org':
      return followWikimediaRedirects(url.substring(url.lastIndexOf('/') + 1))
  }
  return url
}

async function downloadImage(url: string): Promise<string | undefined> {
  logger.debug('Downloading image from', url)
  const parsed = await parseScrapeUrl(url)
  return parsed
}

async function queryArtwork(a: Artists) {
  return fetchImagesRemote(a)
}

async function checkCoverExists(coverPath: string | undefined): Promise<boolean> {
  if (coverPath && !coverPath.startsWith('http')) {
    try {
      await fs.promises.access(coverPath)
      return true
    } catch (e) {
      logger.warn(`${coverPath} not accessible`)
      return false
    }
  }
  return false
}

// Await for each download to complete
// This way we can avoid being rate limited unless ofc you are at nasa and got 10gbps with real low latency
// Even then axios will handle rate limits
export async function fetchArtworks(
  artists: Artists[],
  observer: SubscriptionObserver<{ artist: Artists; cover: string | undefined }>
) {
  for (const a of artists) {
    const coverExists = await checkCoverExists(a.artist_coverPath)
    if (!coverExists) {
      try {
        logger.debug('Fetching artwork for', a.artist_name)
        const result = await queryArtwork(a)
        observer.next({ artist: a, cover: result })
      } catch (e) {
        logger.debug('Failed to fetch artwork for', a.artist_name, e)
        observer.next({ artist: a, cover: undefined })
      }
    }
  }
  logger.debug('Finished fetching artworks')
  observer.complete()
}
