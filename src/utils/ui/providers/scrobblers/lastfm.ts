import axios from 'axios';
import { cache } from '@/utils/ui/providers/genericProvider';
import md5 from 'md5'

const AUTH_BASE_URL = 'http://www.last.fm/api/'
const API_BASE_URL = 'http://ws.audioscrobbler.com/2.0'
const KeytarService = 'MoosyncLastFmToken'

type authenticatedBody = {
  api_key: string
  method: string
  token?: string
  sk?: string
}

type sessionKey = string

export class LastFMProvider {
  private _session: sessionKey | undefined
  private api = axios.create({
    adapter: cache.adapter,
    baseURL: API_BASE_URL
  })
  private initialized = false
  private scrobbleTimeout: ReturnType<typeof setTimeout> | undefined
  private oAuthChannel: string | undefined

  private uninitializedQueue: (() => Promise<any>)[] = []

  constructor() {
    this.fetchStoredToken().then((data) => {
      if (data)
        this._session = data
      this.initialized = true

        ; (async () => {
          for (const p of this.uninitializedQueue) {
            await p()
          }
        })()
    })
  }

  private getMethodSignature(...params: any[]) {
    let str = ''
    let allParams: { [key: string]: any } = {}

    for (const data of params) {
      if (data) {
        allParams = {
          ...allParams,
          ...data
        }
      }
    }

    const keys = Object.keys(allParams).sort()

    for (const key of keys) {
      str += key + allParams[key]
    }
    str += process.env.LastFmSecret
    return md5(str)
  }

  private async populateRequest(axiosMethod: 'GET' | 'POST', lastFmMethod: string, data?: any, token?: string): Promise<any> {
    if (this.initialized) {
      const defaultParams: authenticatedBody = {
        api_key: process.env.LastFmApiKey!,
        method: lastFmMethod,
      }

      if (token) {
        defaultParams.token = token
      } else {
        if (!this._session) {
          return
        } else {
          defaultParams.sk = this._session
        }
      }

      const signatureParams = data

      const parsedParams = new URLSearchParams({
        ...defaultParams,
        ...signatureParams,
        api_sig: this.getMethodSignature(defaultParams, signatureParams),
        format: 'json'
      })

      const resp = await this.api({
        method: axiosMethod,
        params: axiosMethod === 'GET' && parsedParams,
        data: axiosMethod === 'POST' && parsedParams
      })

      return resp.data
    } else {
      let resolveT: (value: any) => void
      const promise = new Promise<any>(resolve => resolveT = resolve)
      this.uninitializedQueue.push(() => this.populateRequest(axiosMethod, lastFmMethod, data, token).then(resolveT))
      return promise
    }
  }

  private async fetchStoredToken() {
    return window.Store.getSecure(KeytarService)
  }

  public async login() {
    if (!this._session) {
      if (!this.oAuthChannel) {
        this.oAuthChannel = await window.WindowUtils.registerOAuthCallback('lastfmcallback')
      }

      return new Promise<boolean>((resolve) => {
        window.WindowUtils.listenOAuth(this.oAuthChannel!, async (data) => {
          const url = new URL(data)
          const token = url.searchParams.get('token')
          const resp = await this.populateRequest('GET', 'auth.getSession', undefined, token!)
          this._session = resp?.session?.key

          if (this._session) {
            window.Store.setSecure(KeytarService, this._session).then(() => {
              resolve(true)
            })
            return
          }
          resolve(false)
        })

        window.WindowUtils.openExternal(AUTH_BASE_URL + `auth/?api_key=${process.env.LastFmApiKey}&cb=https://ovenoboyo.github.io/moosync-oauth-redirect/lastfm`)
      })
    } else {
      return true
    }
  }

  public async signOut() {
    window.Store.removeSecure(KeytarService)
    this._session = undefined
  }

  private serializeBody(body: any) {
    const newBody: any = {}
    for (const [key, value] of Object.entries(body)) {
      if (value) {
        if (Array.isArray(value)) {
          for (const index in value) {
            newBody[`${key}[${index}]`] = value[index]
          }
        } else {
          newBody[key] = value
        }
      }
    }
    return newBody
  }

  public async scrobble(song: Song | null | undefined) {
    if (this.initialized && song) {
      const parsedSong = this.serializeBody({
        track: song.title,
        album: song.album?.album_name,
        album_artist: song.album?.album_artist && song.album?.album_artist[0],
        duration: song.duration,
      })

      this.populateRequest('POST', 'track.updateNowPlaying', {
        ...parsedSong,
        artist: song.artists && song.artists[0],
      })

      if (this.scrobbleTimeout) {
        clearTimeout(this.scrobbleTimeout)
      }

      this.scrobbleTimeout = setTimeout(async () => {
        await this.populateRequest('POST', 'track.scrobble', {
          ...parsedSong, artist: song.artists && song.artists, timestamp: (Date.now() / 1000).toFixed(0)
        })
      }, 30 * 1e3)
    }
  }

  public async getUserDetails() {
    const resp = await this.populateRequest('GET', 'user.getInfo')
    return resp?.user?.name
  }
}