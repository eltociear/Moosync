/* 
 *  window.d.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { SongAPIOptions, EntityApiOptions } from '@moosync/moosync-types';


interface DBUtils {
  removeSongs: (songs: Song[]) => Promise<void>
  storeSongs: (songs: Song[]) => Promise<void>
  createPlaylist: (name: string, desc: string, imgSrc: string) => Promise<string>
  addToPlaylist: (playlistID: string, ...songIDs: Song[]) => Promise<void>
  removePlaylist: (playlistID: string) => Promise<void>
}

interface providerUtils {
  login: () => Promise<void>
}

interface searchUtils {
  searchSongsByOptions: (options?: SongAPIOptions) => Promise<Song[]>
  searchEntityByOptions: (options: EntityApiOptions) => Promise<T[]>
  searchAll: (term: string) => Promise<SearchResult>
  searchYT: (term: string) => Promise<YoutubeItem[]>
  scrapeLastFM: (url: string) => Promise<any>
}

interface fileUtils {
  scan: () => Promise<void>
  saveAudioTOFile: (path: string, blob: Buffer) => Promise<string>
  saveImageToFile: (path: string, blob: Buffer) => Promise<string>
  savePlaylistCover: (b64: string) => Promise<string>
  isAudioExists: (path: string) => Promise<string | null>
  isImageExists: (path: string) => Promise<string | null>
  listenInitialFileOpenRequest: (callback: (paths: string[]) => void) => void
}

interface preferenceUtils {
  load: () => Promise<Preferences>
  save: (preference: Preferences) => Promise<void>
  saveSelective: (key: string, value: any, isExtension?: boolean) => Promise<void>
  loadSelective: (key: string, isExtension?: boolean) => Promise<Object>
  notifyPreferenceChanged: (key: string, value: any) => Promise<void>
}

interface store {
  getSecure: (key: string) => Promise<string | null>
  setSecure: (key: string, value: string) => Promise<void>
  removeSecure: (key: string) => Promise<void>
}

interface windowUtils {
  openWindow: (isMainWindow: boolean) => Promise<void>
  closeWindow: (isMainWindow: boolean) => Promise<void>
  minWindow: (isMainWindow: boolean) => Promise<void>
  maxWindow: (isMainWindow: boolean) => Promise<boolean>
  openFileBrowser: (file: boolean, filters?: Electron.FileFilter[]) => Promise<Electron.OpenDialogReturnValue>
  toggleDevTools: (isMainWindow: boolean) => Promise<void>
  openExternal: (url: string) => Promise<void>
  registerOAuthCallback: (path: string) => Promise<string>
  deregisterOAuthCallback: (path: string) => Promise<void>
  listenOAuth: (channelID: string, callback: (data: string) => void) => void
  mainWindowHasMounted: () => Promise<void>
  isWindowMaximized: (isMainWindow: boolean) => Promise<boolean>
}

interface loggerUtils {
  info: (message: any) => Promise<void>
  error: (message: any) => Promise<void>
}

interface notifierUtils {
  registerMainProcessNotifier: (callback: (obj: NotificationObject) => void) => void
}

interface extensionUtils {
  install: (...path: string[]) => Promise<installMessage>
  uninstall: (packageName: string) => Promise<void>
  sendEvent: (data: extensionHostMessage) => Promise<void>
  getAllExtensions: () => Promise<ExtensionDetails[]>
  listenRequests: (callback: (request: extensionUIRequestMessage) => void) => void
  replyToRequest: (data: extensionReplyMessage) => void
  toggleExtStatus: (packageName: string, enabled: boolean) => Promise<void>
}

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

declare global {
  interface Window {
    DBUtils: DBUtils
    SearchUtils: searchUtils
    FileUtils: fileUtils
    PreferenceUtils: preferenceUtils
    WindowUtils: windowUtils
    ProviderUtils: providerUtils
    Store: store
    LoggerUtils: loggerUtils
    NotifierUtils: notifierUtils
    ExtensionUtils: extensionUtils
    ThemeUtils: themeUtils
  }
}
