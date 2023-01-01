/*
 *  covers.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import path from 'path'
import photon from '@silvia-odwyer/photon-node'
import { promises as fsP } from 'fs'
import { v4 } from 'uuid'
import { access, writeFile } from 'fs/promises'
import { expose } from 'threads/worker'
import { Observable } from 'observable-fns'
import { TransferDescriptor } from 'threads'

expose({
  writeBuffer: (bufferDesc: TransferDescriptor<Buffer>, basePath: string, hash?: string, onlyHigh = false) => {
    return new Observable((observer) => {
      writeBuffer(Buffer.from(bufferDesc.send), basePath, hash, onlyHigh).then((val) => {
        observer.next(val)
        observer.complete()
      })
    })
  }
})

async function writeBuffer(bufferDesc: Buffer, basePath: string, hash?: string, onlyHigh = false) {
  const id = hash ?? v4()

  const highPath = path.join(basePath, id + '-high.jpg')

  // Write new file only if it doesn't exist
  try {
    await access(highPath)
  } catch {
    await writeNoResize(bufferDesc, highPath)
  }

  let lowPath
  if (!onlyHigh) {
    lowPath = path.join(basePath, id + '-low.jpg')

    try {
      await access(lowPath)
    } catch {
      let image = photon.base64_to_image(bufferDesc.toString('base64'))
      image = photon.resize(image, 80, 80, 1)

      await writeFile(lowPath, image.get_bytes())
      image.free()
    }
  }

  return { high: highPath, low: lowPath }
}

async function writeNoResize(buffer: Buffer, path: string) {
  await fsP.writeFile(path, buffer)
}
