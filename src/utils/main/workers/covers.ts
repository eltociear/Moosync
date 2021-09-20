/* 
 *  covers.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { TransferDescriptor, expose } from 'threads';

import Jimp from 'jimp'
import path from 'path';

expose({
  async writeCover(buffer: TransferDescriptor<Buffer>, basePath: string, id: string, low: boolean = false) {
    return writeBuffer(buffer, basePath, id, low)
  },
})

async function writeBuffer(bufferDesc: TransferDescriptor<Buffer>, basePath: string, id: string, low: boolean) {
  try {
    const highPath = path.join(basePath, id + '-high.jpg')
    await (await Jimp.read(Buffer.from(bufferDesc.send))).cover(800, 800).quality(80).writeAsync(highPath)

    if (low) {
      const lowPath = path.join(basePath, id + '-low.jpg')
      await (await Jimp.read(Buffer.from(bufferDesc.send))).cover(80, 80).quality(80).writeAsync(lowPath)

      return { high: highPath, low: lowPath }
    }

    return { high: highPath }
  } catch (e) {
    console.error(e)
  }
}
