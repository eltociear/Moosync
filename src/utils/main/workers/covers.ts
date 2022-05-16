/*
 *  covers.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import path from 'path'
import { Sharp, SharpOptions } from 'sharp'
import { promises as fsP } from 'fs'

let sharpInstance: (
  input?:
    | Buffer
    | Uint8Array
    | Uint8ClampedArray
    | Int8Array
    | Uint16Array
    | Int16Array
    | Uint32Array
    | Int32Array
    | Float32Array
    | Float64Array
    | string,
  options?: SharpOptions
) => Sharp

let importFailed = false

export async function writeBuffer(bufferDesc: Buffer, basePath: string, id: string, onlyHigh = false) {
  if (!sharpInstance && !importFailed) {
    try {
      sharpInstance = (await import('sharp')).default
    } catch (e) {
      importFailed = true
      console.error(
        'Failed to import sharp. Probably missing libvips-cpp.so. Read more at https://moosync.app/wiki/#known-bugs'
      )
    }
  }

  const highPath = path.join(basePath, id + '-high.jpg')

  if (sharpInstance) {
    await sharpInstance(Buffer.from(bufferDesc)).resize(800, 800).toFile(highPath)
  } else {
    await writeNoResize(bufferDesc, highPath)
  }

  let lowPath
  if (!onlyHigh) {
    lowPath = path.join(basePath, id + '-low.jpg')

    if (sharpInstance) {
      await sharpInstance(Buffer.from(bufferDesc)).resize(80, 80).toFile(lowPath)
    } else {
      lowPath = highPath
    }
  }

  return { high: highPath, low: lowPath }
}

async function writeNoResize(buffer: Buffer, path: string) {
  await fsP.writeFile(path, buffer)
}
