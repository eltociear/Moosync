/* 
 *  sync.d.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

interface fragmentedData {
  type: string
  message: any
}

interface prefetchData {
  _id: string
  album: string
  artist: string
  sender: string
  type: 'LOCAL' | 'YOUTUBE' | 'SPOTIFY'
}