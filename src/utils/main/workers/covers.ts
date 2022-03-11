/*
 *  covers.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import path from 'path'
import sharp from 'sharp'

export async function writeBuffer(bufferDesc: Buffer, basePath: string, id: string) {
  const highPath = path.join(basePath, id + '-high.jpg')
  await sharp(Buffer.from(bufferDesc)).resize(800, 800).toFile(highPath)

  const lowPath = path.join(basePath, id + '-low.jpg')
  await sharp(Buffer.from(bufferDesc)).resize(80, 80).toFile(lowPath)

  return { high: highPath, low: lowPath }
}
