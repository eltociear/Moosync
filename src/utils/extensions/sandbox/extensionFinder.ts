/*
 *  extensionFinder.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { promises as fsP } from 'fs'
import path from 'path'

export abstract class AbstractExtensionFinder {
  abstract findExtensions(): AsyncGenerator<UnInitializedExtensionItem>
}

export class ExtensionFinder extends AbstractExtensionFinder {
  private searchPaths: string[]

  constructor(searchPaths: string[]) {
    super()
    this.searchPaths = searchPaths
  }

  private async parseJson(filePath: string) {
    const raw = await fsP.readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  }

  public async *findExtensions(): AsyncGenerator<UnInitializedExtensionItem> {
    for (const searchPath of this.searchPaths) {
      try {
        // Should proceed if file exists
        await fsP.access(searchPath)

        const dirents = await fsP.readdir(searchPath, { withFileTypes: true })
        const filtered = dirents.filter((val) => val.isDirectory())
        for (const folder of filtered) {
          const extDir = await fsP.readdir(path.join(searchPath, folder.name), { withFileTypes: true })
          const possibleManifests = extDir.filter((val) => val.isFile() && val.name === 'package.json')
          if (possibleManifests && possibleManifests.length > 0) {
            const manifestPath = path.join(searchPath, folder.name, possibleManifests[0].name)
            const manifest = await this.parseJson(manifestPath)
            if (manifest.moosyncExtension) {
              const modulePath = path.join(searchPath, folder.name, manifest.extensionEntry)
              console.debug('Found extension at', path.join(searchPath, folder.name))
              yield {
                name: manifest.displayName,
                packageName: manifest.name,
                desc: manifest.description,
                author: manifest.author,
                version: manifest.version,
                entry: modulePath,
                extensionPath: path.join(searchPath, folder.name)
              }
            }
          }
        }
      } catch (e) {
        console.warn('Extension search path', searchPath, "doesn't exist. Creating it.")
        // Create directory if it does not exist
        fsP.mkdir(searchPath)
      }
    }
  }
}
