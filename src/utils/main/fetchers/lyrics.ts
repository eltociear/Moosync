import { app } from 'electron'
import https from 'https'
import path from 'path'
import { CacheHandler } from './cacheFile'

interface AZSuggestions {
  term?: string
  songs?: {
    url: string
    autocomplete: string
  }[]
}

export class AZLyricsFetcher extends CacheHandler {
  private blocked = false

  constructor() {
    super(path.join(app.getPath('cache'), app.getName(), 'azlyrics.cache'), false)
  }

  public async getLyrics(artists: string[], title: string) {
    let lyrics = await this.queryAZLyrics(artists, title)
    if (!lyrics) {
      lyrics = await this.queryGoogle(artists, title)
    }

    return lyrics
  }
  private async queryAZLyrics(artists: string[], title: string) {
    if (!this.blocked) {
      const baseURL = 'https://search.azlyrics.com/suggest.php?q='
      const sanitizedTitle = this.sanitizeTitle(title)
      const url = this.formulateUrl(baseURL, artists, sanitizedTitle)
      console.debug('Searching for lyrics at', url)

      let resp: AZSuggestions = {}
      try {
        resp = (await this.get(url, undefined, true)) as AZSuggestions
      } catch (e) {
        console.warn('AZ Lyrics probably blocked this IP. Not using AZ lyrics for this session')
        this.blocked = true
      }

      if (resp.songs && resp.songs.length > 0) {
        const url = resp.songs[0].url
        console.debug('Got lyrics url', url, resp.songs[0].autocomplete)

        const lyricsResp = await this.get(url)

        // const parsed = parse(lyricsResp)
        const lyrics = lyricsResp.split('<div class="ringtone">')[1].split('<div class="noprint"')[0]
        return lyrics
          .substring(lyrics.indexOf('-->') + 3)
          .split('</div>')[0]
          .replaceAll('<br>', '\n')
      }
    }
  }

  private randomUserAgent() {
    const agents = [
      'Mozilla/5.0 (Windows; U; Windows NT 5.1; it; rv:1.8.1.11) Gecko/20071127 Firefox/2.0.0.11',
      'Mozilla/5.0 (iPad; CPU OS 8_4_1 like Mac OS X) AppleWebKit/600.1.4 (KHTML, like Gecko) Version/8.0 Mobile/12H321 Safari/600.1.4',
      'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; .NET CLR 1.1.4322; .NET CLR 2.0.50727)',
      'Mozilla/5.0 (compatible; Konqueror/3.5; Linux) KHTML/3.5.5 (like Gecko) (Kubuntu)',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.79 Safari/537.36 Edge/14.14393',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:11.0) Gecko/20100101 Firefox/11.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:53.0) Gecko/20100101 Firefox/53.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
    ]

    return agents[Math.floor(Math.random() * agents.length)]
  }

  private async get(url: string, referrer?: string, tryJson = false): Promise<string> {
    const cached = this.getCache(url)
    if (cached) {
      return tryJson ? JSON.parse(cached) : cached
    }

    return new Promise((resolve, reject) => {
      const parsed = new URL(url)
      const options: https.RequestOptions = {
        path: parsed.pathname + parsed.search,
        hostname: parsed.hostname,
        headers: { 'User-Agent': this.randomUserAgent(), referer: referrer ?? '' }
      }
      const request = https.get(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          try {
            if (tryJson) {
              resolve(JSON.parse(data))
              this.addToCache(parsed.toString(), data)
              return
            }
            resolve(data)
          } catch (e) {
            console.warn('Failed to parse result from', parsed, 'to JSON')
            reject(e)
          }
        })
      })

      request.on('error', function (e) {
        reject(e.message)
      })

      request.end()
    })
  }

  private formulateUrl(baseURL: string, artists: string[], title: string, appendLyrics = false) {
    // If title contains - then it probably already has artists included in it
    if (appendLyrics) {
      title = title.trim() + ' lyrics'
    }

    if (title.split('-').length >= 2) {
      return encodeURI(baseURL + title)
    }

    title = title.toLowerCase()
    for (const a of artists) {
      title.replaceAll(a.toLowerCase(), '')
    }
    return encodeURI(baseURL + artists.join(', ') + ' - ' + title)
  }

  private sanitizeTitle(title: string) {
    // TODO: Combine all regex in one line
    return title
      .replaceAll(/\((.*?)\)|\[(.*?)\]/gm, '')
      .replaceAll(/(\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]|\u274C)/g, '')
      .replaceAll(/(?<=\/\/).+/g, '')
      .toLowerCase()
      .replaceAll('official', '')
      .replaceAll('music', '')
      .replaceAll('video', '')
  }

  private async queryGoogle(artists: string[], title: string) {
    const url = this.formulateUrl('https://www.google.com/search?q=', artists, this.sanitizeTitle(title), true)

    console.debug('Searching for lyrics at', url)

    const resp = await this.get(url, 'https://www.google.com/')

    const final = resp
      ?.split('<div class="BNeawe tAd8D AP7Wnd"><div><div class="BNeawe tAd8D AP7Wnd">')
      .slice(1)
      .join('')
      .split('<div class="BNeawe uEec3 AP7Wnd">')[0]
      .replaceAll(/<(.*?)>/g, '')

    if (final && !final.includes('did not match')) {
      console.debug('Found lyrics on google', url)
      return final
    }
  }
}
