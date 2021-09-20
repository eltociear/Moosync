/* 
 *  remoteSongMixin.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { Component, Vue } from 'vue-property-decorator';

import { toSong } from '@/utils/models/youtube';

@Component
export default class RemoteSong extends Vue {
  public addYTItemsToLibrary(...songs: YoutubeItem[]) {
    window.DBUtils.storeSongs(toSong(...songs))
  }

  public addSongsToLibrary(...songs: Song[]) {
    window.DBUtils.storeSongs(songs)
  }
}