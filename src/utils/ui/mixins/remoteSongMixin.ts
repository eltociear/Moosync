/*
 *  remoteSongMixin.ts is a part of Moosync.
 *
 *  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/mainWindow/store'

@Component
export default class RemoteSong extends Vue {
  public async addSongsToLibrary(...songs: Song[]) {
    const storedSongs = await window.DBUtils.storeSongs(songs)
    this.fetchCoverDetails(...storedSongs)
    this.$toasted.show(`Added ${songs.length} songs to library`)
  }

  private async fetchCoverDetails(...songs: (Song | undefined)[]) {
    for (const s of songs) {
      if (s && s.artists) {
        for (const a of s.artists) {
          if (!a.artist_coverPath) {
            const fetchedArtist =
              (await vxm.providers.spotifyProvider.getArtistDetails(a)) ??
              (await vxm.providers.youtubeProvider.getArtistDetails(a))

            console.log(fetchedArtist)
            await window.DBUtils.updateArtist({
              ...a,
              artist_coverPath: fetchedArtist?.artist_coverPath
            })
          }
        }
      }
    }
  }
}
