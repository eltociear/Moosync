<!-- 
  index.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-container fluid class="album-container" @contextmenu="contextHandler">
    <b-row no-gutters class="page-title">Playlists</b-row>
    <b-row class="d-flex">
      <b-col col xl="2" md="3" v-for="playlist in allPlaylists" :key="playlist.playlist_id" class="card-col">
        <CardView
          :title="playlist.playlist_name"
          :imgSrc="playlist.playlist_coverPath"
          :id="playlist.playlist_id"
          :iconBgColor="getIconBgColor(playlist)"
          @click.native="gotoPlaylist(playlist)"
          @CardContextMenu="getPlaylistMenu(arguments[0], playlist)"
        >
          <template slot="icon">
            <SpotifyIcon v-if="playlist.playlist_id.startsWith('spotify-')" color="#07C330" :filled="true" />
            <YoutubeIcon v-if="playlist.playlist_id.startsWith('youtube-')" color="#E62017" :filled="true" />
          </template>

          <template #defaultCover>
            <PlaylistDefault />
          </template>
        </CardView>
      </b-col>
    </b-row>
    <DeleteModal id="playlistDeleteModal" @confirm="deletePlaylist" />
  </b-container>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-property-decorator'
import CardView from '@/mainWindow/components/generic/CardView.vue'
import { mixins } from 'vue-class-component'
import RouterPushes from '@/utils/ui/mixins/RouterPushes'
import ContextMenuMixin from '@/utils/ui/mixins/ContextMenuMixin'
import { vxm } from '@/mainWindow/store'
import SpotifyIcon from '@/icons/Spotify.vue'
import YoutubeIcon from '@/icons/Youtube.vue'
import PlaylistDefault from '@/icons/PlaylistDefault.vue'
import DeleteModal from '../../../commonComponents/ConfirmationModal.vue'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'

@Component({
  components: {
    CardView,
    SpotifyIcon,
    YoutubeIcon,
    PlaylistDefault,
    DeleteModal
  }
})
export default class Albums extends mixins(RouterPushes, ContextMenuMixin) {
  @Prop({ default: () => () => {} })
  private enableRefresh!: () => void

  private allPlaylists: Playlist[] = []

  private playlistInAction: Playlist | undefined

  private getIconBgColor(playlist: Playlist) {
    if (playlist.playlist_id.startsWith('youtube-')) {
      return '#E62017'
    }

    if (playlist.playlist_id.startsWith('spotify-')) {
      return '#07C330'
    }
  }

  private async getPlaylists(invalidateCache = false) {
    let localPlaylists = await window.SearchUtils.searchEntityByOptions({
      playlist: true
    })
    this.allPlaylists = [...localPlaylists]

    vxm.providers.youtubeProvider.getUserPlaylists(invalidateCache).then((data) => this.allPlaylists.push(...data))
    vxm.providers.spotifyProvider.getUserPlaylists(invalidateCache).then((data) => this.allPlaylists.push(...data))
  }

  private contextHandler(event: MouseEvent) {
    this.getContextMenu(event, {
      type: 'GENERAL_PLAYLIST',
      args: {
        refreshCallback: this.refresh
      }
    })
  }

  private deletePlaylist() {
    if (this.playlistInAction) window.DBUtils.removePlaylist(this.playlistInAction.playlist_id)
    this.refresh()
  }

  mounted() {
    this.enableRefresh()
    this.getPlaylists()
    this.listenGlobalRefresh()
  }

  private refresh(invalidateCache = false) {
    this.getPlaylists(invalidateCache).then(() => (vxm.playlist.updated = true))
  }

  private listenGlobalRefresh() {
    bus.$on(EventBus.REFRESH_PAGE, () => {
      this.refresh(true)
    })
  }

  private getPlaylistMenu(event: Event, playlist: Playlist) {
    this.playlistInAction = playlist
    this.getContextMenu(event, {
      type: 'PLAYLIST',
      args: { playlist: playlist, deleteCallback: () => this.$bvModal.show('playlistDeleteModal') }
    })
  }
}
</script>

<style lang="sass" scoped>
.album-container
  position: absolute

.title
  font-weight: bold
  font-size: 55px
  margin-left: 15px
  margin-bottom: 50px
  margin-top: 20px
</style>
