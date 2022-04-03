/*
 *  ipc.d.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

interface IpcRequest<T = unknown> {
  type: string
  responseChannel?: string
  params: T
}

interface IpcChannelInterface {
  name: string
  handle(event: IpcMainEvent, request: IpcRequest): void
}

declare namespace ExtensionHostRequests {
  interface EventTrigger {
    data: extensionEventMessage
  }

  interface Install {
    path: string[]
  }

  interface GetAllExtensions {
    packageName: string
    enabled: boolean
  }

  interface ToggleExtensionStatus {
    packageName: string
    enabled: boolean
  }

  interface RemoveExtension {
    packageName: string
  }

  interface ExtraEvent {
    event: ExtraExtensionEvents
  }
}

declare namespace LoggerRequests {
  interface LogEvents {
    message: unknown[]
  }
}

declare namespace PlaylistRequests {
  interface AddToPlaylist {
    playlist_id: string
    song_ids: Song[]
  }

  interface CreatePlaylist {
    name: string
    desc: string
    imgSrc: string
  }

  interface SaveCover {
    b64: string
  }

  interface RemoveExportPlaylist {
    playlist_id: string
  }
}

declare namespace PreferenceRequests {
  interface Save {
    key: string
    value: unknown
    isExtension?: boolean
  }

  interface Load {
    key: string
    isExtension?: boolean
    defaultValue: unknown
  }

  interface PreferenceChange {
    key: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
  }

  interface ThemeID {
    id: string
  }

  interface Theme {
    theme: ThemeDetails
  }

  interface SongView {
    menu: songMenu
  }
}

declare namespace SearchRequests {
  interface Search {
    searchTerm: string
  }

  interface SearchYT {
    title: string
    artists?: string[]
    matchTitle?: boolean
    scrapeYTMusic?: boolean
    scrapeYoutube?: boolean
  }

  interface YTSuggestions {
    videoID: string
  }

  interface LastFMSuggestions {
    url: string
  }

  interface SongOptions {
    options?: SongAPIOptions
  }

  interface EntityOptions {
    options: EntityApiOptions
  }

  interface LyricsScrape {
    artists: string[]
    title: string
  }
}

declare namespace SongRequests {
  interface Songs {
    songs: Song[]
  }

  interface SaveBuffer {
    path: string
    blob: NodeJS.ArrayBufferView
  }

  interface FileExists {
    path: string
  }

  interface Lyrics {
    id: string
    lyrics: string
  }
}

declare namespace StoreRequests {
  interface Set {
    token: string
    service: string
  }

  interface Get {
    service: string
  }
}

declare namespace WindowRequests {
  interface MainWindowCheck {
    isMainWindow: boolean
    args?: unknown
  }

  interface FileBrowser extends MainWindowCheck {
    file: boolean
    filters?: Electron.FileFilter[]
  }

  interface URL {
    url: string
  }

  interface Path {
    path: string
  }
}
