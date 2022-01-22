/* 
 *  scraper.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { Observable, SubscriptionObserver } from 'observable-fns'
import { Transfer, TransferDescriptor } from 'threads'
import { expose } from 'threads/worker';

import axios from 'axios'
import axiosRetry from 'axios-retry'
import { createHash } from 'crypto'
import fs from 'fs'
import rateLimit from 'axios-rate-limit'

expose({
  fetchMBID(artists: artists[]) {
    return new Observable((observer) => {
      fetchMBID(artists, observer)
    })
  },

  fetchArtworks(artists: artists[]) {
    return new Observable((observer) => {
      fetchArtworks(artists, observer)
    })
  },
})

// const coverPath: string
const musicbrainz = rateLimit(
  axios.create({
    baseURL: 'https://musicbrainz.org/ws/2/artist/',
    headers: { 'User-Agent': 'moosync/0.1.0 (ovenoboyo@gmail.com)' },
  }),
  {
    maxRequests: 1,
    perMilliseconds: 1250,
  }
)

axiosRetry(axios, {
  retryDelay: (retryCount) => {
    return retryCount * 1000
  },
})

async function queryMbid(name: string) {
  return musicbrainz.get<any>(`/?limit=1&query=artist:${name.replace(' ', '%20').replace('.', '')}`)
}

async function getAndUpdateMBID(a: artists): Promise<artists | undefined> {
  const data = await queryMbid(a.artist_name!)
  if (data.data && data.data.artists.length > 0 && data.data.artists[0].id) {
    return { artist_id: a.artist_id, artist_mbid: data.data.artists[0].id }
  }
}

export function fetchMBID(artists: artists[], observer: SubscriptionObserver<artists | undefined>) {
  const promises: Promise<void>[] = []
  for (const a of artists) {
    if (!a.artist_mbid) {
      promises.push(getAndUpdateMBID(a).then((updated) => observer.next(updated)))
    }
  }
  Promise.all(promises.map((p) => p.catch((e) => e))).then(() => observer.complete())
}

async function queryArtistUrls(id: string) {
  return musicbrainz.get<any>(`/${id}?inc=url-rels`)
}

async function fetchImagesRemote(a: artists) {
  if (a.artist_mbid) {
    const data = await queryArtistUrls(a.artist_mbid)
    if (data.data.relations) {
      for (const r of data.data.relations) {
        if (r.type == 'image') {
          return downloadImage(r.url.resource)
        }
      }
    }

    try {
      const url = await fetchFanartTv(a.artist_mbid)
      if (url) return downloadImage(url)
    } catch (e) {
      undefined
    }
  }
  if (a.artist_name) {
    const url = await fetchTheAudioDB(a.artist_name)
    if (url) return downloadImage(url)
  }
}

async function fetchTheAudioDB(artist_name: string) {
  try {
    const data = await axios.get<any>(`https://theaudiodb.com/api/v1/json/1/search.php?s=${artist_name.replace(' ', '%20')}`)
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
    console.error(e)
  }
}

async function fetchFanartTv(mbid: string): Promise<string | undefined> {
  const data = await axios.get<any>(`http://webservice.fanart.tv/v3/music/${mbid}?api_key=68746a37e506c5fe70c80e13dc84d8b2`)
  if (data.data) {
    return data.data.artistthumb ? data.data.artistthumb[0].url : undefined
  }
}

async function followWikimediaRedirects(fileName: string): Promise<string | undefined> {
  const data = (
    await axios.get<any>(`https://commons.wikimedia.org/w/api.php?action=query&redirects=1&titles=${fileName}&format=json`)
  ).data.query
  let filename = ''
  for (const i in data.pages) {
    filename = data.pages[i].title.replace('File:', '').replace(/\s+/g, '_')
    break
  }
  if (filename) {
    const md5 = createHash('md5').update(filename).digest('hex')
    return `https://upload.wikimedia.org/wikipedia/commons/${md5[0]}/${md5[0] + md5[1]}/${filename}`
  }

  return undefined
}

async function parseScrapeUrl(url: string) {
  const parsed = new URL(url)
  switch (parsed.hostname) {
    case 'commons.wikimedia.org':
      return followWikimediaRedirects(url.substring(url.lastIndexOf('/') + 1))
  }
  return url
}

async function downloadImage(url: string): Promise<ArrayBuffer | undefined> {
  const parsed = await parseScrapeUrl(url)
  if (parsed) {
    const data = await axios.get(parsed, { responseType: 'arraybuffer' })
    return data.data
  }
}

async function queryArtwork(a: artists) {
  const data = await fetchImagesRemote(a)
  return data
}

async function checkCoverExists(coverPath: string | undefined): Promise<boolean> {
  if (coverPath && !coverPath.startsWith('http')) {
    try {
      await fs.promises.access(coverPath)
      return true
    } catch (e) {
      console.info(`${coverPath} not accessible`)
      return false
    }
  }
  return false
}


// Await for each download to complete
// This way we can avoid being rate limited unless ofc you are at nasa and got 10gbps with real low latency
// Even then axios will handle rate limits
export async function fetchArtworks(artists: artists[], observer: SubscriptionObserver<{ artist: artists, cover: TransferDescriptor<Buffer> | undefined }>) {
  for (const a of artists) {
    const coverExists = await checkCoverExists(a.artist_coverPath)
    if (!coverExists) {
      try {
        const result = await queryArtwork(a)
        observer.next({ artist: a, cover: result && Transfer(result) })
      } catch (e) {
        console.error(e)
        observer.next({ artist: a, cover: undefined })
      }
    }
  }
  observer.complete()
}
