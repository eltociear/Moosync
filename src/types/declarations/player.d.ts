/* 
 *  player.d.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

type AudioType = 'STREAMING' | 'LOCAL'

type PlayerState = 'PLAYING' | 'PAUSED' | 'STOPPED' | 'LOADING'

type PlayerType = 'LOCAL' | 'YOUTUBE'

interface SongQueue {
  data: { [id: string]: Song }
  order: { id: string, songID: string }[]
  index: number
}


type playlistInfo = { [key: string]: string }
