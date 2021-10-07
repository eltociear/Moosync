/* 
 *  preload.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { EntityApiOptions, SongAPIOptions } from '@moosync/moosync-types';
import {
  ExtensionHostEvents,
  IpcEvents,
  LoggerEvents,
  PlaylistEvents,
  PreferenceEvents,
  ScannerEvents,
  SearchEvents,
  ServiceProviderEvents,
  SongEvents,
  StoreEvents,
  WindowEvents
} from '@/utils/main/ipc/constants';
import { contextBridge, ipcRenderer } from 'electron';

import { IpcRendererHolder } from '@/utils/preload/ipc/index';

const ipcRendererHolder = new IpcRendererHolder(ipcRenderer)

contextBridge.exposeInMainWorld('DBUtils', {
  createPlaylist: (name: string, desc: string, imgSrc: string) =>
    ipcRendererHolder.send(IpcEvents.PLAYLIST, { type: PlaylistEvents.CREATE_PLAYLIST, params: { name: name, desc: desc, imgSrc: imgSrc } }),
  addToPlaylist: (playlistID: string, ...songIDs: Song[]) =>
    ipcRendererHolder.send(IpcEvents.PLAYLIST, {
      type: PlaylistEvents.ADD_TO_PLAYLIST,
      params: { playlist_id: playlistID, song_ids: songIDs },
    }),
  removePlaylist: (playlistID: string) => ipcRendererHolder.send(IpcEvents.PLAYLIST, { type: PlaylistEvents.REMOVE_PLAYLIST, params: { playlist_id: playlistID } }),
  storeSongs: (songs: Song[]) =>
    ipcRendererHolder.send(IpcEvents.SONG, { type: SongEvents.STORE_SONG, params: { songs: songs } }),
  removeSongs: (songs: Song[]) =>
    ipcRendererHolder.send(IpcEvents.SONG, { type: SongEvents.REMOVE_SONG, params: { songs: songs } }),
})

contextBridge.exposeInMainWorld('PreferenceUtils', {
  saveSelective: (key: string, value: any, isExtension?: boolean) => ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.SAVE_SELECTIVE_PREFERENCES, params: { key, value, isExtension } }),
  loadSelective: (key: string, isExtension?: boolean) => ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.LOAD_SELECTIVE_PREFERENCES, params: { key, isExtension } }),
  notifyPreferenceChanged: (key: string, value: any) => ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.PREFERENCE_REFRESH, params: { key, value } }),
})

contextBridge.exposeInMainWorld('ProviderUtils', {
  login: () => ipcRendererHolder.send(IpcEvents.SERVICE_PROVIDERS, { type: ServiceProviderEvents.LOGIN }),
})

contextBridge.exposeInMainWorld('Store', {
  getSecure: (key: string) => ipcRendererHolder.send(IpcEvents.STORE, { type: StoreEvents.GET_SECURE, params: { service: key } }),
  setSecure: (key: string, value: string) => ipcRendererHolder.send(IpcEvents.STORE, { type: StoreEvents.SET_SECURE, params: { service: key, token: value } }),
  removeSecure: (key: string) => ipcRendererHolder.send(IpcEvents.STORE, { type: StoreEvents.REMOVE_SECURE, params: { service: key } }),
})

contextBridge.exposeInMainWorld('FileUtils', {
  scan: () => ipcRendererHolder.send(IpcEvents.SCANNER, { type: ScannerEvents.SCAN_MUSIC }),
  saveAudioToFile: (path: string, blob: Buffer) =>
    ipcRendererHolder.send(IpcEvents.SONG, { type: SongEvents.SAVE_AUDIO_TO_FILE, params: { path: path, blob: blob } }),
  saveImageToFile: (path: string, blob: Buffer) =>
    ipcRendererHolder.send(IpcEvents.SONG, { type: SongEvents.SAVE_IMAGE_TO_FILE, params: { path: path, blob: blob } }),
  isAudioExists: (path: string) =>
    ipcRendererHolder.send(IpcEvents.SONG, { type: SongEvents.AUDIO_EXISTS, params: { path: path } }),
  isImageExists: (path: string) =>
    ipcRendererHolder.send(IpcEvents.SONG, { type: SongEvents.IMAGE_EXISTS, params: { path: path } }),
  savePlaylistCover: (b64: string) => ipcRendererHolder.send(IpcEvents.PLAYLIST, { type: PlaylistEvents.SAVE_COVER, params: { b64: b64 } }),
  listenInitialFileOpenRequest: (callback: (paths: string[]) => void) => ipcRendererHolder.on(SongEvents.GOT_FILE_PATH, callback)
})

contextBridge.exposeInMainWorld('SearchUtils', {
  searchSongsByOptions: (options?: SongAPIOptions) =>
    ipcRendererHolder.send(IpcEvents.SEARCH, { type: SearchEvents.SEARCH_SONGS_BY_OPTIONS, params: { options } }),
  searchEntityByOptions: (options: EntityApiOptions) =>
    ipcRendererHolder.send(IpcEvents.SEARCH, { type: SearchEvents.SEARCH_ENTITY_BY_OPTIONS, params: { options } }),
  searchAll: (term: string) =>
    ipcRendererHolder.send(IpcEvents.SEARCH, { type: SearchEvents.SEARCH_ALL, params: { searchTerm: term } }),
  searchYT: (term: string) =>
    ipcRendererHolder.send(IpcEvents.SEARCH, { type: SearchEvents.SEARCH_YT, params: { searchTerm: term } }),
  getYTSuggestions: (videoID: string) => ipcRendererHolder.send(IpcEvents.SEARCH, { type: SearchEvents.YT_SUGGESTIONS, params: { videoID } }),
  scrapeLastFM: (url: string) => ipcRendererHolder.send(IpcEvents.SEARCH, { type: SearchEvents.SCRAPE_LASTFM, params: { url } }),
})

contextBridge.exposeInMainWorld('ThemeUtils', {
  saveTheme: (theme: ThemeDetails) => ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.SET_THEME, params: { theme } }),
  removeTheme: (id: string) => ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.REMOVE_THEME, params: { id } }),
  getTheme: (id?: string) => ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.GET_THEME, params: { id } }),
  getAllThemes: () => ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.GET_ALL_THEMES }),
  setActiveTheme: (id: string) => ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.SET_ACTIVE_THEME, params: { id } }),
  getActiveTheme: () => ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.GET_ACTIVE_THEME }),
  setSongView: (menu: songMenu) => ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.SET_SONG_VIEW, params: { menu } }),
  getSongView: () => ipcRendererHolder.send(IpcEvents.PREFERENCES, { type: PreferenceEvents.GET_SONG_VIEW }),
  listenThemeChanged: (callback: (themeId: ThemeDetails) => void) => ipcRendererHolder.on(PreferenceEvents.THEME_REFRESH, callback),
  listenSongViewChanged: (callback: (menu: songMenu) => void) => ipcRendererHolder.on(PreferenceEvents.SONG_VIEW_REFRESH, callback),
})

contextBridge.exposeInMainWorld('WindowUtils', {
  openWindow: (isMainWindow: boolean, args?: any) => ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.OPEN_WIN, params: { isMainWindow, args } }),
  closeWindow: (isMainWindow: boolean) => ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.CLOSE_WIN, params: { isMainWindow } }),
  minWindow: (isMainWindow: boolean) => ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.MIN_WIN, params: { isMainWindow } }),
  maxWindow: (isMainWindow: boolean) => ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.MAX_WIN, params: { isMainWindow } }),
  isWindowMaximized: (isMainWindow: boolean) => ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.IS_MAXIMIZED, params: { isMainWindow } }),
  openFileBrowser: (file: boolean, filters?: Electron.FileFilter[]) => ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.OPEN_FILE_BROWSER, params: { file, filters } }),
  toggleDevTools: (isMainWindow: boolean) => ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.TOGGLE_DEV_TOOLS, params: { isMainWindow } }),
  openExternal: (url: string) => ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.OPEN_URL_EXTERNAL, params: { url: url } }),
  registerOAuthCallback: (path: string) => ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.REGISTER_OAUTH_CALLBACK, params: { path } }),
  deregisterOAuthCallback: (path: string) => ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.DEREGISTER_OAUTH_CALLBACK, params: { path } }),
  listenOAuth: (channelID: string, callback: (data: URL) => void) => ipcRendererHolder.once(channelID, callback),
  listenArgs: (callback: (args: any) => void) => ipcRendererHolder.once(WindowEvents.GOT_EXTRA_ARGS, callback),
  mainWindowHasMounted: () => ipcRendererHolder.send(IpcEvents.BROWSER_WINDOWS, { type: WindowEvents.MAIN_WINDOW_HAS_MOUNTED })
})

contextBridge.exposeInMainWorld('LoggerUtils', {
  info: (message: any) =>
    ipcRendererHolder.send(IpcEvents.LOGGER, { type: LoggerEvents.INFO, params: { message: message } }),
  error: (message: any) =>
    ipcRendererHolder.send(IpcEvents.LOGGER, { type: LoggerEvents.ERROR, params: { message: message } })
})

contextBridge.exposeInMainWorld('NotifierUtils', {
  registerMainProcessNotifier: (callback: (obj: NotificationObject) => void) => ipcRendererHolder.on(IpcEvents.NOTIFIER, callback)
})

contextBridge.exposeInMainWorld('ExtensionUtils', {
  install: (...path: string[]) => ipcRendererHolder.send(IpcEvents.EXTENSION_HOST, { type: ExtensionHostEvents.INSTALL, params: { path: path } }),
  uninstall: (packageName: string) => ipcRendererHolder.send(IpcEvents.EXTENSION_HOST, { type: ExtensionHostEvents.REMOVE_EXT, params: { packageName } }),
  sendEvent: (data: extensionHostMessage) => ipcRendererHolder.send(IpcEvents.EXTENSION_HOST, { type: ExtensionHostEvents.EVENT_TRIGGER, params: { data: data } }),
  getAllExtensions: () => ipcRendererHolder.send(IpcEvents.EXTENSION_HOST, { type: ExtensionHostEvents.GET_ALL_EXTENSIONS }),
  listenRequests: (callback: (request: extensionUIRequestMessage) => void) => ipcRendererHolder.on(ExtensionHostEvents.EXTENSION_REQUESTS, callback),
  replyToRequest: (data: extensionReplyMessage) => ipcRenderer.send(ExtensionHostEvents.EXTENSION_REQUESTS, data),
  toggleExtStatus: (packageName: string, enabled: boolean) => ipcRendererHolder.send(IpcEvents.EXTENSION_HOST, { type: ExtensionHostEvents.TOGGLE_EXT_STATUS, params: { packageName, enabled } }),
})
