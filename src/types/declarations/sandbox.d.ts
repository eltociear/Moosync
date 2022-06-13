/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 *  sandbox.d.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

type GithubRepoResponse = {
  sha: string
  url: string
  tree: {
    path: string
    mode: string
    type: 'blob' | 'tree'
    sha: string
    url: string
  }[]
}

type FetchedExtensionManifest = {
  name: string
  packageName: string
  logo: string
  description: string
  url: string
  release: {
    type: 'github-release' | 'url'
    url: string
    version: string
  }
}

type ExtInstallStatus = {
  packageName: string
  status: string
  error?: unknown
  progress: number
}

type extensionEventMessage = {
  type: keyof MoosyncExtensionTemplate
  data: any
  packageName?: string
}

type extensionRequestMessage = {
  type: import('@/utils/extensions/constants').extensionRequests
  channel: string
  data: any
  extensionName: string
}

type extensionUIRequestMessage = {
  type: import('@/utils/extensions/constants').extensionUIRequests
  channel: string
  data: any
  extensionName: string
}

type extensionReplyMessage = extensionRequestMessage

type extensionHostMessage = extensionEventMessage | mainRequestMessage

type mainRequestMessage = {
  type: import('@/utils/extensions/constants').mainRequests
  channel: string
  data: any
}

type mainReplyMessage = mainRequestMessage

type mainHostMessage = mainReplyMessage | extensionRequestMessage

interface installMessage {
  success: boolean
  message?: string
}

type mainHostMessage =
  | {
      type: 'get-all-songs'
      data: undefined
    }
  | {
      type: 'get-installed-extensions'
      data: ExtensionDetails[]
    }

interface ExtensionDetails {
  name: string
  packageName: string
  desc: string
  author: string
  version: string
  hasStarted: boolean
  entry: string
  preferences: ExtensionPreferenceGroup[]
  extensionPath: string
  extensionIcon: string | undefined
}

type ExtraExtensionEventCombinedReturnType<T extends ExtraExtensionEventTypes> = {
  [key: string]: ExtraExtensionEventReturnType<T>
}

interface ExtraExtensionEvents<T extends ExtraExtensionEventTypes> {
  type: T
  data: ExtraExtensionEventData<T>
  packageName?: string
}

interface ExtendedExtensionAPI extends extensionAPI {
  _emit: <T extends ExtraExtensionEventTypes>(
    event: ExtraExtensionEvents<T>
  ) => Promise<ExtraExtensionEventReturnType<T> | undefined>
  _getContextMenuItems: () => ExtendedExtensionContextMenuItems<ContextMenuTypes>[]
  _getAccountDetails: () => AccountDetails[]
  _getSearchProvider: () => string | undefined
}

interface ExtensionItem extends ExtensionDetails {
  instance: MoosyncExtensionTemplate
  preferences: ExtensionPreferenceGroup[]
  vm: import('vm2').NodeVM
  global: {
    api: ExtendedExtensionAPI
  }
}

interface UnInitializedExtensionItem {
  name: string
  packageName: string
  desc: string
  author: string
  version: string
  entry: string
  extensionPath: string
  extensionIcon: string | undefined
}

interface getExtensionOptions {
  started?: boolean
  packageName?: string
}

interface ExtendedExtensionContextMenuItems<T extends ContextMenuTypes>
  extends Omit<ExtensionContextMenuItem<T>, 'children'> {
  id: string
  packageName: string
  children?: ExtendedExtensionContextMenuItems<T>[]
}

interface NodeRequire {
  (dependencies: string[], callback: (...args: any[]) => any, errorback?: (err: any) => void): any
  config(data: unknown): unknown
  onError: (err: Error) => void
  __$__nodeRequire<T>(moduleName: string): T
  getStats(): ReadonlyArray<LoaderEvent>
  hasDependencyCycle(): boolean
  define(amdModuleId: string, dependencies: string[], callback: (...args: any[]) => any): any
}
