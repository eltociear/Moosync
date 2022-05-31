interface InvidiousSong extends Song {
  invidiousPlaybackUrl?: string
}

interface ExtendedPlaylist extends Playlist {
  extension?: string
  isRemote?: boolean
}

type StrippedAccountDetails = Omit<Omit<AccountDetails, 'signinCallback'>, 'signoutCallback'>

type ExtendedLoginModalData = LoginModalOptions & {
  packageName: string
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
