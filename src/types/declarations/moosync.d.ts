type Song = import('@moosync/moosync-types').Song
type Album = import('@moosync/moosync-types').Album
type Artists = import('@moosync/moosync-types').Artists
type Genre = import('@moosync/moosync-types').Genre
type Playlist = import('@moosync/moosync-types').Playlist
interface ExtendedPlaylist extends Playlist {
  extension?: string
  icon?: string
}

type playerControls = import('@moosync/moosync-types').playerControls

type EntityApiOptions = import('@moosync/moosync-types').EntityApiOptions
type OriginalSongAPIOptions = import('@moosync/moosync-types').SongAPIOptions
type SearchableSong = Omit<import('@moosync/moosync-types').SearchableSong, 'extension'> & { extension?: string }
type SongAPIOptions = Omit<OriginalSongAPIOptions, 'song'> & {
  song?: SearchableSong
}

type ExtensionFactory = import('@moosync/moosync-types').ExtensionFactory
type MoosyncExtensionTemplate = import('@moosync/moosync-types').MoosyncExtensionTemplate
type PlayerType = import('@moosync/moosync-types').PlayerTypes

type Progress = { total: number; current: number }

type ExtraExtensionEventData<T> = import('@moosync/moosync-types').ExtraExtensionEventData<T>
type ExtraExtensionEventReturnType<T> = import('@moosync/moosync-types').ExtraExtensionEventReturnType<T>
type ExtraExtensionEventTypes = import('@moosync/moosync-types').ExtraExtensionEventTypes

declare namespace NodeJS {
  export interface ProcessEnv {
    ELECTRON_NODE_INTEGRATION: boolean
    MOOSYNC_VERSION: string
    DEBUG_LOGGING: boolean
    APPIMAGE: string
    YoutubeClientID: string
    YoutubeClientSecret: string
    LastFmApiKey: string
    LastFmSecret: string
    SpotifyClientID: string
    SpotifyClientSecret: string
    FanartTVApiKey: string
  }
}
