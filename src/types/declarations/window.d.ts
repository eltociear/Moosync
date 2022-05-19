/*
 *  window.d.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

/**
 * Utils related to database operations
 */
interface DBUtils {
  /**
   * Remove songs from database
   * @param songs array of songs to add
   */
  removeSongs: (songs: Song[]) => Promise<void>

  /**
   * Store songs in database
   * @param songs array of songs to remove
   */
  storeSongs: (songs: Song[]) => Promise<void>

  /**
   * Update songs in database
   * @param songs array of songs which are to be updated. Songs are found using _id.
   */
  updateSongs: (songs: Song[]) => Promise<void>

  updatePlaylist: (playlist: Playlist) => Promise<void>
  updateArtist: (artist: Artists) => Promise<void>
  updateAlbum: (album: Album) => Promise<void>

  /**
   * Create new playlist
   * @param name name of playlist
   * @param desc description of playlist
   * @param imgSrc cover image path of playlist
   */
  createPlaylist: (playlist: Partial<Playlist>) => Promise<string>

  /**
   * Add song to playlist
   * @param playlistID id of playlist in which song is to be added
   * @param songIDs songs to be added in playlist
   */
  addToPlaylist: (playlistID: string, ...songs: Song[]) => Promise<void>

  /**
   * Remove playlist
   * @param playlistID id of playlist to be removed
   */
  removePlaylist: (playlistID: string) => Promise<void>

  exportPlaylist: (playlistID: string) => Promise<void>

  updateLyrics: (id: string, lyrics: string) => Promise<void>
}

/**
 * Utils related to search operations
 */
interface searchUtils {
  /**
   * Search song by options
   */
  searchSongsByOptions: (options: SongAPIOptions) => Promise<Song[]>

  /**
   * Search entities like album, artists, playlists, genre by options
   */
  searchEntityByOptions: <T>(options: EntityApiOptions) => Promise<T[]>

  /**
   * Search all by a term
   * @param term term to search entities and songs by
   * @param SearchResult object containing songs, albums, artists, genre, playlists, youtube results
   */
  searchAll: (term: string) => Promise<SearchResult>

  /**
   * Search youtube music by a term.
   * @param term term to search youtube music by
   */
  searchYT: (
    title: string,
    artists?: string[],
    matchTitle = true,
    scrapeYTMusic = true,
    scrapeYoutube = false
  ) => Promise<Song[]>

  /**
   * Get suggestions similar to provided video id
   */
  getYTSuggestions: (videoID: string) => Promise<Song[]>

  /**
   * Scrape a webpage and parse it to json
   */
  scrapeLastFM: (url: string) => Promise<unknown>

  searchLyrics: (artists: string[], title: string) => Promise<string>

  requestInvidious: <K extends InvidiousResponses.InvidiousApiResources>(
    resource: K,
    search: InvidiousResponses.SearchObject<K>,
    authorization: string | undefined,
    invalidateCache = false
  ) => Promise<InvidiousResponses.ResponseType<K> | undefined>
}

/**
 * Utils related to file operations
 */
interface fileUtils {
  /**
   * Start scan operation
   * Scans for audio files in specified paths
   */
  scan: () => Promise<void>
  scanSinglePlaylist: (playlistPath: string) => Promise<{ songs: Song[]; playlist: Partial<Playlist> | null }>

  getScanProgress: () => Promise<Progress>

  /**
   * Available only in Preference window
   */
  listenScanProgress: (callback: (progress: Progress) => void) => void

  /**
   * Save audio blob to file
   */
  saveAudioToFile: (path: string, blob: Buffer) => Promise<string>

  /**
   * Save image blob to file
   */
  saveImageToFile: (path: string, blob: Buffer) => Promise<string>

  /**
   * Save base64 of image to file
   * @returns path where image was stored
   */
  savePlaylistCover: (b64: string) => Promise<string>

  /**
   * Check if file exists at path
   * @returns file path if file exists otherwise returns undefined
   */
  isAudioExists: (path: string) => Promise<string | undefined>

  /**
   * Check if file exists at path
   * @returns file path if file exists otherwise returns undefined
   */
  isImageExists: (path: string) => Promise<string | undefined>

  /**
   * If some file is opened with moosync, the path will be passed to the renderer from this method
   */
  listenInitialFileOpenRequest: (callback: (paths: string[]) => void) => void
}

/**
 * Utils related to preferences
 */
interface preferenceUtils {
  load: () => Promise<Preferences>
  save: (preference: Preferences) => Promise<void>
  saveSelective: (key: string, value: unknown, isExtension?: boolean) => Promise<void>
  loadSelective: <T>(key: string, isExtension?: boolean, defaultValue?: T) => Promise<T>
  notifyPreferenceChanged: (key: string, value: unknown) => Promise<void>
  listenPreferenceChange: (callback: (key: string, value: unknown) => void) => void
}

/**
 * Utils related to secure key store
 */
interface store {
  getSecure: (key: string) => Promise<string | null>
  setSecure: (key: string, value: string) => Promise<void>
  removeSecure: (key: string) => Promise<void>
}

/**
 * Utils related to window operations
 */
interface windowUtils {
  openWindow: (isMainWindow: boolean, args?: unknown) => Promise<void>
  closeWindow: (isMainWindow: boolean) => Promise<void>
  minWindow: (isMainWindow: boolean) => Promise<void>
  maxWindow: (isMainWindow: boolean) => Promise<boolean>
  hasFrame: () => Promise<boolean>
  showTitlebarIcons: () => Promise<boolean>
  openFileBrowser: (
    isMainWindow: boolean,
    file: boolean,
    filters?: Electron.FileFilter[]
  ) => Promise<Electron.OpenDialogReturnValue>
  toggleDevTools: (isMainWindow: boolean) => Promise<void>
  openExternal: (url: string) => Promise<void>
  registerOAuthCallback: (path: string) => Promise<string>
  deregisterOAuthCallback: (path: string) => Promise<void>
  listenOAuth: (channelID: string, callback: (data: string) => void) => void
  listenArgs: (callback: (args: unknown | undefined) => void) => void
  mainWindowHasMounted: () => Promise<void>
  isWindowMaximized: (isMainWindow: boolean) => Promise<boolean>
  dragFile: (path: string) => void
  automateSpotify: () => Promise<{ clientID: string; clientSecret: string } | undefined>
  restartApp: () => Promise<void>
  updateZoom: () => Promise<void>
}

/**
 * Utils related to logging operations
 */
interface loggerUtils {
  info: (...message: unknown[]) => Promise<void>
  error: (...message: unknown[]) => Promise<void>
  warn: (...message: unknown[]) => Promise<void>
  debug: (...message: unknown[]) => Promise<void>
  trace: (...message: unknown[]) => Promise<void>
  watchLogs: (callback: (data: unknown) => void) => Promise<void>
  unwatchLogs: () => Promise<void>
  setLogLevel: (level: import('loglevel').LogLevelDesc) => Promise<void>
}

/**
 * Utils related to notifications
 */
interface notifierUtils {
  registerMainProcessNotifier: (callback: (obj: NotificationObject) => void) => void
  isLibvipsAvailable: () => Promise<boolean>
}

/**
 * Utils related to extensions
 */
interface extensionUtils {
  install: (...path: string[]) => Promise<installMessage>
  uninstall: (packageName: string) => Promise<void>
  sendEvent: <T extends ExtraExtensionEventTypes>(
    event: ExtraExtensionEvents<T>
  ) => Promise<ExtraExtensionEventReturnType<T>>
  getAllExtensions: () => Promise<ExtensionDetails[]>
  getExtensionIcon: (packageName: string) => Promise<string>
  listenRequests: (callback: (request: extensionUIRequestMessage) => void) => void
  replyToRequest: (data: extensionReplyMessage) => void
  toggleExtStatus: (packageName: string, enabled: boolean) => Promise<void>
  downloadExtension: (ext: FetchedExtensionManifest) => Promise<boolean>
  listenExtInstallStatus: (callback: (data: ExtInstallStatus) => void) => void
  getContextMenuItems: (type: ContextMenuTypes) => Promise<ExtendedExtensionContextMenuItems<ContextMenuTypes>[]>
  fireContextMenuHandler: (
    id: string,
    packageName: string,
    arg: ExtensionContextMenuHandlerArgs<ContextMenuTypes>
  ) => Promise<void>
}

/**
 * Utils related to themes
 */
interface themeUtils {
  saveTheme: (theme: ThemeDetails) => Promise<void>
  removeTheme: (id: string) => Promise<void>
  getTheme: (id?: string) => Promise<ThemeDetails>
  getAllThemes: (id?: string) => Promise<{ [key: string]: ThemeDetails } | undefined>
  setActiveTheme: (id: string) => Promise<void>
  getActiveTheme: () => Promise<ThemeDetails | undefined>
  setSongView: (menu: songMenu) => Promise<void>
  getSongView: () => Promise<songMenu>
  listenThemeChanged: (callback: (themeId: ThemeDetails) => void) => void
  listenSongViewChanged: (callback: (menu: songMenu) => void) => void
}

interface updateUtils {
  check: () => void
  listenUpdate: (callback: (hasUpdate: boolean) => void) => void
  updateNow: () => void
}

interface Window {
  DBUtils: DBUtils
  SearchUtils: searchUtils
  FileUtils: fileUtils
  PreferenceUtils: preferenceUtils
  WindowUtils: windowUtils
  Store: store
  LoggerUtils: loggerUtils
  NotifierUtils: notifierUtils
  ExtensionUtils: extensionUtils
  ThemeUtils: themeUtils
  UpdateUtils: updateUtils
}
