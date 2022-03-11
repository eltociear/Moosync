type Song = import('@moosync/moosync-types').Song
type Album = import('@moosync/moosync-types').Album
type Artists = import('@moosync/moosync-types').Artists
type Genre = import('@moosync/moosync-types').Genre
type Playlist = import('@moosync/moosync-types').Playlist

type playerControls = import('@moosync/moosync-types').playerControls

type EntityApiOptions = import('@moosync/moosync-types').EntityApiOptions
type SongAPIOptions = import('@moosync/moosync-types').SongAPIOptions

type ExtensionFactory = import('@moosync/moosync-types').ExtensionFactory
type MoosyncExtensionTemplate = import('@moosync/moosync-types').MoosyncExtensionTemplate

declare namespace NodeJS {
  export interface ProcessEnv {
    DEBUG_LOGGING: boolean
    YoutubeClientID: string
    YoutubeClientSecret: string
    LastFmApiKey: string
    LastFmSecret: string
    SpotifyClientID: string
    SpotifyClientSecret: string
  }
}
