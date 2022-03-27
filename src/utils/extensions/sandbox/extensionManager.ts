/*
 *  extensionManager.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { ExtensionRequestGenerator } from './api'
import { InMemoryRegistry } from './extensionRegistry'
import { NodeVM } from 'vm2'
import log from 'loglevel'
import path from 'path'
import { prefixLogger } from '../../main/logger/utils'
import { readFile } from 'fs/promises'

export abstract class AbstractExtensionManager {
  abstract instantiateAndRegister(extension: UnInitializedExtensionItem): Promise<void>
  abstract deregister(packageName: string): void
  abstract getExtensions(options?: getExtensionOptions): Iterable<ExtensionItem>
  abstract setStarted(packageName: string, status: boolean): void
}

export class ExtensionManager extends AbstractExtensionManager {
  private extensionRegistry = new InMemoryRegistry()
  private logsPath: string

  constructor(logsPath: string) {
    super()
    this.logsPath = logsPath
  }

  private register(extensionItem: ExtensionItem) {
    this.extensionRegistry.register(extensionItem)
  }

  deregister(packageName: string) {
    this.extensionRegistry.deregister(packageName)
  }

  private getProcessEnv() {
    const env = JSON.parse(JSON.stringify(process.env)) as Partial<NodeJS.ProcessEnv>
    delete env.FanartTVApiKey
    delete env.LastFmApiKey
    delete env.LastFmSecret
    delete env.SpotifyClientID
    delete env.SpotifyClientSecret
    delete env.YoutubeClientID
    delete env.YoutubeClientSecret

    delete env['YOUTUBECLIENTID']
    delete env['YOUTUBECLIENTSECRET']
    delete env['LASTFMAPIKEY']
    delete env['LASTFMSECRET']
    delete env['FANARTTVAPIKEY']
    delete env['GH_TOKEN']

    env['MOOSYNC_VERSION'] = process.env.MOOSYNC_VERSION
    return env
  }

  private async getVM(entryFilePath: string, extensionPath: string) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const events = require('events')
    const vm = new NodeVM({
      console: 'inherit',
      sandbox: {},
      env: this.getProcessEnv(),
      nesting: true,
      require: {
        external: true,
        context: 'host',
        builtin: ['*'],
        root: [path.dirname(entryFilePath), extensionPath],
        mock: {
          events
        }
      }
    })

    return vm
  }

  private getGlobalObject(packageName: string, entryFilePath: string) {
    const child = log.getLogger(packageName)
    prefixLogger(this.logsPath, child)
    const logLevel = process.env.DEBUG_LOGGING ? log.levels.DEBUG : log.levels.INFO
    child.setLevel(logLevel)

    return {
      __dirname: path.dirname(entryFilePath),
      __filename: entryFilePath,
      api: new ExtensionRequestGenerator(packageName),
      logger: child
    }
  }

  private readFileNoCache(path: string) {
    return readFile(path, { flag: 'rs', encoding: 'utf-8' })
  }

  private async checkExtValidityAndGetInstance(
    entryFilePath: string,
    extensionPath: string
  ): Promise<{ vm: NodeVM; factory: ExtensionFactory } | undefined> {
    try {
      const file = await this.readFileNoCache(entryFilePath)
      const vm = await this.getVM(entryFilePath, extensionPath)
      const extension = vm.run(file, entryFilePath)

      let instance

      if (typeof extension === 'function') {
        instance = new extension()
      }

      if (typeof extension === 'object') {
        instance = new extension.default()
      }

      if (!Array.isArray(instance.extensionDescriptors)) {
        return
      }

      for (const factory of instance.extensionDescriptors) {
        if (factory.create) {
          return { factory: factory, vm }
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  private async setGlobalObjectToVM(vm: NodeVM, packageName: string, entryFilePath: string) {
    const globalObj = this.getGlobalObject(packageName, entryFilePath)
    vm.freeze(globalObj.api, 'api')
    vm.freeze(globalObj.logger, 'logger')
  }

  async instantiateAndRegister(extension: UnInitializedExtensionItem) {
    const vmObj = await this.checkExtValidityAndGetInstance(extension.entry, extension.extensionPath)
    if (vmObj) {
      this.setGlobalObjectToVM(vmObj.vm, extension.packageName, extension.entry)

      const preferences = vmObj.factory.registerPreferences ? await vmObj.factory.registerPreferences() : []
      const instance = await vmObj.factory.create()

      this.register({
        name: extension.name,
        desc: extension.desc,
        author: extension.author,
        packageName: extension.packageName,
        version: extension.version,
        hasStarted: false,
        entry: extension.entry,
        vm: vmObj.vm,
        extensionPath: extension.extensionPath,
        extensionIcon: extension.extensionIcon,
        preferences,
        instance
      })
    }

    console.debug(`Registered ${extension.name} - ${extension.desc}`)
  }

  getExtensions(options?: getExtensionOptions): Iterable<ExtensionItem> {
    return this.extensionRegistry.get(options)
  }

  setStarted(packageName: string, status: boolean) {
    this.extensionRegistry.setStarted(packageName, status)
  }
}
