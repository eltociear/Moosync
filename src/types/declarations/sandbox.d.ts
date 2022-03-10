/* eslint-disable @typescript-eslint/no-explicit-any */
/*
 *  sandbox.d.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

type extensionEventMessage = {
  type: keyof MoosyncExtensionTemplate
  data: any
  packageName?: string
}

type extensionRequestMessage = {
  type: import('@/utils/extensions/constants').extensionRequests
  channel: string
  data: any
}

type extensionUIRequestMessage = {
  type: import('@/utils/extensions/constants').extensionUIRequests
  channel: string
  data: any
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
}

interface ExtensionItem extends ExtensionDetails {
  instance: MoosyncExtensionTemplate
  preferences: ExtensionPreferenceGroup[]
  vm: import('vm2').NodeVM
}

interface UnInitializedExtensionItem {
  name: string
  packageName: string
  desc: string
  author: string
  version: string
  entry: string
}

interface getExtensionOptions {
  started?: boolean
  packageName?: string
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
