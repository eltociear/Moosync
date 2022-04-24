interface InvidiousSong extends Song {
  invidiousPlaybackUrl?: string
}

interface ExtendedPlaylist extends Playlist {
  extension?: string
}

type SongAPIOptions = Omit<OriginalSongAPIOptions, 'song'> & {
  song?: SearchableSong
}

type Progress = { total: number; current: number }

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
