/*
 *  preload.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import {
  ExtensionHostEvents,
  IpcEvents,
  LoggerEvents,
  PlaylistEvents,
  PreferenceEvents,
  ScannerEvents,
  SearchEvents,
  SongEvents,
  StoreEvents,
  WindowEvents,
  UpdateEvents,
  NotifierEvents
} from '@/utils/main/ipc/constants'
import { contextBridge, ipcRenderer } from 'electron'

import { IpcRendererHolder } from '@/utils/preload/ipc/index'
import { LogLevelDesc } from 'loglevel'

const ipcRendererHolder = new IpcRendererHolder(ipcRenderer)

contextBridge.exposeInMainWorld('DBUtils', {
  createPlaylist: (playlist: Partial<Playlist>) =>
    ipcRendererHolder.send<PlaylistRequests.CreatePlaylist>(IpcEvents.PLAYLIST, {
      type: PlaylistEvents.CREATE_PLAYLIST,
      params: { playlist }
    }),

  updatePlaylist: (playlist: Partial<Playlist>) =>
    ipcRendererHolder.send<PlaylistRequests.CreatePlaylist>(IpcEvents.PLAYLIST, {
      type: PlaylistEvents.UPDATE_PLAYLIST,
      params: { playlist }
    }),

  addToPlaylist: (playlistID: string, ...songIDs: Song[]) =>
    ipcRendererHolder.send<PlaylistRequests.AddToPlaylist>(IpcEvents.PLAYLIST, {
      type: PlaylistEvents.ADD_TO_PLAYLIST,
      params: { playlist_id: playlistID, song_ids: songIDs }
    }),

  removePlaylist: (playlistID: string) =>
    ipcRendererHolder.send<PlaylistRequests.RemoveExportPlaylist>(IpcEvents.PLAYLIST, {
      type: PlaylistEvents.REMOVE_PLAYLIST,
      params: { playlist_id: playlistID }
    }),

  exportPlaylist: (playlistID: string) =>
    ipcRendererHolder.send<PlaylistRequests.RemoveExportPlaylist>(IpcEvents.PLAYLIST, {
      type: PlaylistEvents.EXPORT,
      params: { playlist_id: playlistID }
    }),

  storeSongs: (songs: Song[]) =>
    ipcRendererHolder.send<SongRequests.Songs>(IpcEvents.SONG, {
      type: SongEvents.STORE_SONG,
      params: { songs: songs }
    }),

  updateSongs: (songs: Song[]) =>
    ipcRendererHolder.send<SongRequests.Songs>(IpcEvents.SONG, {
      type: SongEvents.UPDATE_SONG,
      params: { songs: songs }
    }),

  updateArtist: (artist: Artists) =>
    ipcRendererHolder.send<SongRequests.UpdateArtist>(IpcEvents.SONG, {
      type: SongEvents.UPDATE_ARTIST,
      params: { artist }
    }),

  updateAlbum: (album: Album) =>
    ipcRendererHolder.send<SongRequests.UpdateAlbum>(IpcEvents.SONG, {
      type: SongEvents.UPDATE_ARTIST,
      params: { album }
    }),

  removeSongs: (songs: Song[]) =>
    ipcRendererHolder.send<SongRequests.Songs>(IpcEvents.SONG, {
      type: SongEvents.REMOVE_SONG,
      params: { songs: songs }
    }),

  updateLyrics: (id: string, lyrics: string) =>
    ipcRendererHolder.send<SongRequests.Lyrics>(IpcEvents.SONG, {
      type: SongEvents.UPDATE_LYRICS,
      params: { id, lyrics }
    })
})

contextBridge.exposeInMainWorld('PreferenceUtils', {
  saveSelective: (key: string, value: unknown, isExtension?: boolean) =>
    ipcRendererHolder.send<PreferenceRequests.Save>(IpcEvents.PREFERENCES, {
      type: PreferenceEvents.SAVE_SELECTIVE_PREFERENCES,
      params: { key, value, isExtension }
    }),

  loadSelective: <T>(key: string, isExtension?: boolean, defaultValue?: T) =>
    ipcRendererHolder.send<PreferenceRequests.Load>(IpcEvents.PREFERENCES, {
      type: PreferenceEvents.LOAD_SELECTIVE_PREFERENCES,
      params: { key, isExtension, defaultValue }
    }),

  notifyPreferenceChanged: (key: string, value: unknown) =>
    ipcRendererHolder.send<PreferenceRequests.PreferenceChange>(IpcEvents.PREFERENCES, {
      type: PreferenceEvents.PREFERENCE_REFRESH,
      params: { key, value }
    }),
  listenPreferenceChange: (callback: (...args: unknown[]) => void) =>
    ipcRendererHolder.on(PreferenceEvents.PREFERENCE_REFRESH, callback)
})

contextBridge.exposeInMainWorld('Store', {
  getSecure: (key: string) =>
    ipcRendererHolder.send<StoreRequests.Get>(IpcEvents.STORE, {
      type: StoreEvents.GET_SECURE,
      params: { service: key }
    }),

  setSecure: (key: string, value: string) =>
    ipcRendererHolder.send<StoreRequests.Set>(IpcEvents.STORE, {
      type: StoreEvents.SET_SECURE,
      params: { service: key, token: value }
    }),

  removeSecure: (key: string) =>
    ipcRendererHolder.send<StoreRequests.Get>(IpcEvents.STORE, {
      type: StoreEvents.REMOVE_SECURE,
      params: { service: key }
    })
})

contextBridge.exposeInMainWorld('FileUtils', {
  scan: () =>
    ipcRendererHolder.send<undefined>(IpcEvents.SCANNER, { type: ScannerEvents.SCAN_MUSIC, params: undefined }),

  getScanProgress: () =>
    ipcRendererHolder.send<void>(IpcEvents.SCANNER, { type: ScannerEvents.GET_PROGRESS, params: undefined }),

  listenScanProgress: (callback: (progress: Progress) => void) =>
    ipcRendererHolder.on(ScannerEvents.PROGRESS_CHANNEL, callback),

  scanSinglePlaylist: (playlistPath: string) =>
    ipcRendererHolder.send<ScannerRequests.ScanSinglePlaylist>(IpcEvents.SCANNER, {
      type: ScannerEvents.SCAN_SINGLE_PLAYLIST,
      params: { playlistPath }
    }),

  saveAudioToFile: (path: string, blob: Buffer) =>
    ipcRendererHolder.send<SongRequests.SaveBuffer>(IpcEvents.SONG, {
      type: SongEvents.SAVE_AUDIO_TO_FILE,
      params: { path: path, blob: blob }
    }),

  saveImageToFile: (path: string, blob: Buffer) =>
    ipcRendererHolder.send<SongRequests.SaveBuffer>(IpcEvents.SONG, {
      type: SongEvents.SAVE_IMAGE_TO_FILE,
      params: { path: path, blob: blob }
    }),

  isAudioExists: (path: string) =>
    ipcRendererHolder.send<SongRequests.FileExists>(IpcEvents.SONG, {
      type: SongEvents.AUDIO_EXISTS,
      params: { path: path }
    }),

  isImageExists: (path: string) =>
    ipcRendererHolder.send<SongRequests.FileExists>(IpcEvents.SONG, {
      type: SongEvents.IMAGE_EXISTS,
      params: { path: path }
    }),

  savePlaylistCover: (b64: string) =>
    ipcRendererHolder.send<PlaylistRequests.SaveCover>(IpcEvents.PLAYLIST, {
      type: PlaylistEvents.SAVE_COVER,
      params: { b64: b64 }
    }),

  listenInitialFileOpenRequest: (callback: (paths: string[]) => void) =>
    ipcRendererHolder.on(SongEvents.GOT_FILE_PATH, callback)
})

contextBridge.exposeInMainWorld('SearchUtils', {
  searchSongsByOptions: (options?: SongAPIOptions) =>
    ipcRendererHolder.send<SearchRequests.SongOptions>(IpcEvents.SEARCH, {
      type: SearchEvents.SEARCH_SONGS_BY_OPTIONS,
      params: { options }
    }),

  searchEntityByOptions: <T extends Artists | Album | Genre | Playlist>(options: EntityApiOptions<T>) =>
    ipcRendererHolder.send<SearchRequests.EntityOptions>(IpcEvents.SEARCH, {
      type: SearchEvents.SEARCH_ENTITY_BY_OPTIONS,
      params: { options }
    }),

  searchAll: (term: string) =>
    ipcRendererHolder.send<SearchRequests.Search>(IpcEvents.SEARCH, {
      type: SearchEvents.SEARCH_ALL,
      params: { searchTerm: term }
    }),

  searchYT: (title: string, artists?: string[], matchTitle = true, scrapeYTMusic = true, scrapeYoutube = false) =>
    ipcRendererHolder.send<SearchRequests.SearchYT>(IpcEvents.SEARCH, {
      type: SearchEvents.SEARCH_YT,
      params: { title, artists, matchTitle, scrapeYTMusic, scrapeYoutube }
    }),

  getYTSuggestions: (videoID: string) =>
    ipcRendererHolder.send<SearchRequests.YTSuggestions>(IpcEvents.SEARCH, {
      type: SearchEvents.YT_SUGGESTIONS,
      params: { videoID }
    }),

  getYTAudioURL: (videoID: string) =>
    ipcRendererHolder.send<SearchRequests.YTSuggestions>(IpcEvents.SEARCH, {
      type: SearchEvents.GET_YT_AUDIO_URL,
      params: { videoID }
    }),

  scrapeLastFM: (url: string) =>
    ipcRendererHolder.send<SearchRequests.LastFMSuggestions>(IpcEvents.SEARCH, {
      type: SearchEvents.SCRAPE_LASTFM,
      params: { url }
    }),

  searchLyrics: (artists: string[], title: string) =>
    ipcRendererHolder.send<SearchRequests.LyricsScrape>(IpcEvents.SEARCH, {
      type: SearchEvents.SCRAPE_LYRICS,
      params: { artists, title }
    }),

  requestInvidious: <K extends InvidiousResponses.InvidiousApiResources>(
    resource: K,
    search: InvidiousResponses.SearchObject<K>,
    authorization: string,
    invalidateCache: boolean
  ) =>
    ipcRendererHolder.send<SearchRequests.InvidiousRequest>(IpcEvents.SEARCH, {
      type: SearchEvents.REQUEST_INVIDIOUS,
      params: { resource, search, authorization, invalidateCache }
    })
})

contextBridge.exposeInMainWorld('ThemeUtils', {
  saveTheme: (theme: ThemeDetails) =>
    ipcRendererHolder.send<PreferenceRequests.Theme>(IpcEvents.PREFERENCES, {
      type: PreferenceEvents.SET_THEME,
      params: { theme }
    }),

  removeTheme: (id: string) =>
    ipcRendererHolder.send<PreferenceRequests.ThemeID>(IpcEvents.PREFERENCES, {
      type: PreferenceEvents.REMOVE_THEME,
      params: { id }
    }),

  getTheme: (id?: string) =>
    ipcRendererHolder.send<PreferenceRequests.ThemeID>(IpcEvents.PREFERENCES, {
      type: PreferenceEvents.GET_THEME,
      params: { id: id ?? 'default' }
    }),

  getAllThemes: () =>
    ipcRendererHolder.send<undefined>(IpcEvents.PREFERENCES, {
      type: PreferenceEvents.GET_ALL_THEMES,
      params: undefined
    }),

  setActiveTheme: (id: string) =>
    ipcRendererHolder.send<PreferenceRequests.ThemeID>(IpcEvents.PREFERENCES, {
      type: PreferenceEvents.SET_ACTIVE_THEME,
      params: { id }
    }),

  getActiveTheme: () =>
    ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.GET_ACTIVE_THEME, params: undefined }),

  setSongView: (menu: songMenu) =>
    ipcRendererHolder.send<PreferenceRequests.SongView>(IpcEvents.PREFERENCES, {
      type: PreferenceEvents.SET_SONG_VIEW,
      params: { menu }
    }),

  getSongView: () =>
    ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.GET_SONG_VIEW, params: undefined }),

  listenThemeChanged: (callback: (themeId: ThemeDetails) => void) =>
    ipcRendererHolder.on(PreferenceEvents.THEME_REFRESH, callback),

  listenSongViewChanged: (callback: (menu: songMenu) => void) =>
    ipcRendererHolder.on(PreferenceEvents.SONG_VIEW_REFRESH, callback)
})

contextBridge.exposeInMainWorld('WindowUtils', {
  openWindow: (isMainWindow: boolean, args?: unknown) =>
    ipcRendererHolder.send<WindowRequests.MainWindowCheck>(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.OPEN_WIN,
      params: { isMainWindow, args }
    }),

  closeWindow: (isMainWindow: boolean) =>
    ipcRendererHolder.send<WindowRequests.MainWindowCheck>(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.CLOSE_WIN,
      params: { isMainWindow }
    }),

  minWindow: (isMainWindow: boolean) =>
    ipcRendererHolder.send<WindowRequests.MainWindowCheck>(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.MIN_WIN,
      params: { isMainWindow }
    }),

  maxWindow: (isMainWindow: boolean) =>
    ipcRendererHolder.send<WindowRequests.MainWindowCheck>(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.MAX_WIN,
      params: { isMainWindow }
    }),

  hasFrame: () =>
    ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.HAS_FRAME, params: undefined }),

  showTitlebarIcons: () =>
    ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.SHOW_TITLEBAR_ICONS, params: undefined }),

  isWindowMaximized: (isMainWindow: boolean) =>
    ipcRendererHolder.send<WindowRequests.MainWindowCheck>(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.IS_MAXIMIZED,
      params: { isMainWindow }
    }),

  openFileBrowser: (isMainWindow: boolean, file: boolean, filters?: Electron.FileFilter[]) =>
    ipcRendererHolder.send<WindowRequests.FileBrowser>(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.OPEN_FILE_BROWSER,
      params: { file, filters, isMainWindow }
    }),

  toggleDevTools: (isMainWindow: boolean) =>
    ipcRendererHolder.send<WindowRequests.MainWindowCheck>(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.TOGGLE_DEV_TOOLS,
      params: { isMainWindow }
    }),

  openExternal: (url: string) =>
    ipcRendererHolder.send<WindowRequests.URL>(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.OPEN_URL_EXTERNAL,
      params: { url: url }
    }),

  registerOAuthCallback: (path: string) =>
    ipcRendererHolder.send<WindowRequests.Path>(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.REGISTER_OAUTH_CALLBACK,
      params: { path }
    }),

  deregisterOAuthCallback: (path: string) =>
    ipcRendererHolder.send<WindowRequests.Path>(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.DEREGISTER_OAUTH_CALLBACK,
      params: { path }
    }),

  triggerOAuthCallback: (path: string) =>
    ipcRendererHolder.send<WindowRequests.Path>(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.TRIGGER_OAUTH_CALLBACK,
      params: { path }
    }),

  listenOAuth: (channelID: string, callback: (data: URL) => void) => ipcRendererHolder.once(channelID, callback),

  listenArgs: (callback: (args: unknown) => void) => ipcRendererHolder.once(WindowEvents.GOT_EXTRA_ARGS, callback),

  mainWindowHasMounted: () =>
    ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, {
      type: WindowEvents.MAIN_WINDOW_HAS_MOUNTED,
      params: undefined
    }),

  dragFile: (path: string) =>
    ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.DRAG_FILE, params: { path } }),

  automateSpotify: () =>
    ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.AUTOMATE_SPOTIFY, params: undefined }),

  restartApp: () =>
    ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.RESTART_APP, params: undefined }),

  updateZoom: () =>
    ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.UPDATE_ZOOM, params: undefined })
})

contextBridge.exposeInMainWorld('LoggerUtils', {
  info: (...message: unknown[]) =>
    ipcRendererHolder.send<LoggerRequests.LogEvents>(IpcEvents.LOGGER, {
      type: LoggerEvents.INFO,
      params: { message: message }
    }),

  error: (...message: unknown[]) =>
    ipcRendererHolder.send<LoggerRequests.LogEvents>(IpcEvents.LOGGER, {
      type: LoggerEvents.ERROR,
      params: { message: message }
    }),

  warn: (...message: unknown[]) =>
    ipcRendererHolder.send<LoggerRequests.LogEvents>(IpcEvents.LOGGER, {
      type: LoggerEvents.WARN,
      params: { message: message }
    }),

  debug: (...message: unknown[]) =>
    ipcRendererHolder.send<LoggerRequests.LogEvents>(IpcEvents.LOGGER, {
      type: LoggerEvents.DEBUG,
      params: { message: message }
    }),

  trace: (...message: unknown[]) =>
    ipcRendererHolder.send<LoggerRequests.LogEvents>(IpcEvents.LOGGER, {
      type: LoggerEvents.TRACE,
      params: { message: message }
    }),

  watchLogs: (callback: (data: unknown) => void) => {
    ipcRendererHolder.on(LoggerEvents.WATCH_LOGS, callback)
    return ipcRendererHolder.send<void>(IpcEvents.LOGGER, { type: LoggerEvents.WATCH_LOGS, params: undefined })
  },

  unwatchLogs: () => ipcRendererHolder.send(IpcEvents.LOGGER, { type: LoggerEvents.UNWATCH_LOGS, params: undefined }),

  setLogLevel: (level: LogLevelDesc) =>
    ipcRendererHolder.send<LoggerRequests.LogLevels>(IpcEvents.LOGGER, {
      type: LoggerEvents.WATCH_LOGS,
      params: { level }
    })
})

contextBridge.exposeInMainWorld('NotifierUtils', {
  registerMainProcessNotifier: (callback: (obj: NotificationObject) => void) =>
    ipcRendererHolder.on(IpcEvents.NOTIFIER, callback),

  isLibvipsAvailable: () =>
    ipcRendererHolder.send(IpcEvents.NOTIFIER, { type: NotifierEvents.LIBVIPS_INSTALLED, params: undefined })
})

contextBridge.exposeInMainWorld('ExtensionUtils', {
  install: (...path: string[]) =>
    ipcRendererHolder.send<ExtensionHostRequests.Install>(IpcEvents.EXTENSION_HOST, {
      type: ExtensionHostEvents.INSTALL,
      params: { path: path }
    }),

  uninstall: (packageName: string) =>
    ipcRendererHolder.send<ExtensionHostRequests.RemoveExtension>(IpcEvents.EXTENSION_HOST, {
      type: ExtensionHostEvents.REMOVE_EXT,
      params: { packageName }
    }),

  getAllExtensions: () =>
    ipcRendererHolder.send(IpcEvents.EXTENSION_HOST, {
      type: ExtensionHostEvents.GET_ALL_EXTENSIONS,
      params: undefined
    }),

  getExtensionIcon: (packageName: string) =>
    ipcRendererHolder.send<ExtensionHostRequests.RemoveExtension>(IpcEvents.EXTENSION_HOST, {
      type: ExtensionHostEvents.GET_EXTENSION_ICON,
      params: { packageName }
    }),

  listenRequests: (callback: (request: extensionUIRequestMessage) => void) =>
    ipcRendererHolder.on(ExtensionHostEvents.EXTENSION_REQUESTS, callback),
  replyToRequest: (data: extensionReplyMessage) => ipcRenderer.send(ExtensionHostEvents.EXTENSION_REQUESTS, data),

  toggleExtStatus: (packageName: string, enabled: boolean) =>
    ipcRendererHolder.send<ExtensionHostRequests.ToggleExtensionStatus>(IpcEvents.EXTENSION_HOST, {
      type: ExtensionHostEvents.TOGGLE_EXT_STATUS,
      params: { packageName, enabled }
    }),

  sendEvent: <T extends ExtraExtensionEventTypes>(event: ExtraExtensionEvents<T>) =>
    ipcRendererHolder.send<ExtensionHostRequests.ExtraEvent>(IpcEvents.EXTENSION_HOST, {
      type: ExtensionHostEvents.SEND_EXTRA_EVENT,
      params: { event }
    }),

  downloadExtension: (ext: FetchedExtensionManifest) =>
    ipcRendererHolder.send<ExtensionHostRequests.DownloadExtension>(IpcEvents.EXTENSION_HOST, {
      type: ExtensionHostEvents.DOWNLOAD_EXTENSION,
      params: { ext }
    }),

  getContextMenuItems: (type: ContextMenuTypes) =>
    ipcRendererHolder.send<ExtensionHostRequests.ContextMenuItems>(IpcEvents.EXTENSION_HOST, {
      type: ExtensionHostEvents.GET_EXT_CONTEXT_MENU,
      params: { type }
    }),

  fireContextMenuHandler: (id: string, packageName: string, arg: ExtensionContextMenuHandlerArgs<ContextMenuTypes>) =>
    ipcRendererHolder.send<ExtensionHostRequests.ContextMenuHandler>(IpcEvents.EXTENSION_HOST, {
      type: ExtensionHostEvents.ON_CONTEXT_MENU_ITEM_CLICKED,
      params: { id, packageName, arg }
    }),

  listenExtInstallStatus: (callback: (data: ExtInstallStatus) => void) =>
    ipcRendererHolder.on(ExtensionHostEvents.EXT_INSTALL_STATUS, callback),

  getRegisteredAccounts: () =>
    ipcRendererHolder.send(IpcEvents.EXTENSION_HOST, {
      type: ExtensionHostEvents.GET_REGISTERED_ACCOUNTS,
      params: undefined
    }),

  listenAccountRegistered: (callback: (details: AccountDetails) => void) => {
    ipcRendererHolder.on(ExtensionHostEvents.ON_ACCOUNT_REGISTERED, callback)
  },

  performAccountLogin: (packageName: string, accountId: string, login: boolean) =>
    ipcRendererHolder.send<ExtensionHostRequests.AccountLogin>(IpcEvents.EXTENSION_HOST, {
      type: ExtensionHostEvents.PERFORM_ACCOUNT_LOGIN,
      params: { packageName, accountId, login }
    }),

  listenExtensionsChanged: (callback: () => void) =>
    ipcRendererHolder.on(ExtensionHostEvents.ON_EXTENSIONS_CHANGED, callback)
})

contextBridge.exposeInMainWorld('UpdateUtils', {
  check: () => ipcRendererHolder.send(IpcEvents.UPDATE, { type: UpdateEvents.CHECK_UPDATES, params: undefined }),

  listenUpdate: (callback: (hasUpdate: boolean) => void) => ipcRendererHolder.on(UpdateEvents.GOT_UPDATE, callback),

  updateNow: () => ipcRendererHolder.send(IpcEvents.UPDATE, { type: UpdateEvents.UPDATE_NOW, params: undefined })
})
