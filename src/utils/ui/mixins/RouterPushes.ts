/*
 *  RouterPushes.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Component, Vue } from 'vue-property-decorator'

@Component
export default class PlayerControls extends Vue {
  public gotoAlbum(album: Album) {
    this.$router.push({
      name: 'albums-id',
      params: {
        id: album.album_id as string
      }
    })
  }

  public gotoGenre(genre: Genre) {
    this.$router.push({
      name: 'genre-id',
      params: {
        id: genre.genre_id
      }
    })
  }

  public gotoArtist(artist: Artists) {
    this.$router.push({
      name: 'artists-id',
      params: {
        id: artist.artist_id,
        name: artist.artist_name ?? '',
        cover: artist.artist_coverPath ?? ''
      }
    })
  }

  public gotoPlaylist(playlist: Playlist) {
    this.$router.push({
      name: 'playlists-id',
      params: {
        id: playlist.playlist_id
      }
    })
  }
}
