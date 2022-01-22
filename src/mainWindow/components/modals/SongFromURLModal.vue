<!-- 
  SongFromURLModal.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-modal class="song-url-modal" centered size="lg" :id="id" :ref="id" hide-footer hide-header>
    <div class="modal-content-container">
      <b-container fluid class="p-0">
        <b-row no-gutters class="d-flex">
          <b-col cols="auto">
            <SongDefault v-if="forceEmptyImg || !parsedSong" class="song-url-cover" />
            <b-img
              v-else
              class="song-url-cover"
              :src="parsedSong.song_coverPath_high"
              @error="handleImageError"
            ></b-img>
          </b-col>
          <b-col cols="9">
            <b-row no-gutters class="song-url-details">
              <b-col cols="12" class="w-100">
                <b-row class="w-100">
                  <div class="title text-truncate" :class="{ deactivated: !parsedSong }">
                    {{ parsedSong ? parsedSong.title : 'New Song' }}
                  </div>
                </b-row>
                <b-row class="w-100">
                  <div class="subtitle text-truncate" :class="{ deactivated: !parsedSong }">
                    {{ parsedSong ? parsedSong.artists && parsedSong.artists.join(', ') : 'Artist' }}
                  </div>
                </b-row>
              </b-col>
            </b-row>
            <b-row no-gutters>
              <b-col cols="12">
                <InputGroup class="input-group" hint="Enter URL Here.. (Youtube or Spotify)" @update="parseURL" />
              </b-col>
            </b-row>
          </b-col>
        </b-row>
      </b-container>
      <div class="mt-3 warning" v-if="!isLoggedIn">* Requires to be logged in to respective services</div>
      <b-button class="close-button ml-3" @click="close">Close</b-button>
      <b-button class="create-button" @click="addToLibrary">Add</b-button>
    </div>
  </b-modal>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import SongDefault from '@/icons/SongDefault.vue'
import InputGroup from '../generic/InputGroup.vue'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'
import { vxm } from '@/mainWindow/store'

@Component({
  components: {
    SongDefault,
    InputGroup
  }
})
export default class SongFromUrlModal extends Vue {
  @Prop({ default: 'SongFromURL' })
  private id!: string

  private forceEmptyImg: boolean = false

  private parsedSong: Song | undefined | null = null

  private refreshCallback?: () => void

  private handleImageError() {
    this.forceEmptyImg = true
  }

  private isLoggedIn = false

  private async parseURL(url: string) {
    this.parsedSong =
      (await vxm.providers.youtubeProvider.getSongDetails(url)) ??
      (await vxm.providers.spotifyProvider.getSongDetails(url)) ??
      null
  }

  private addToLibrary() {
    window.DBUtils.storeSongs([this.parsedSong as Song])

    this.refreshCallback && this.refreshCallback()
    this.close()
  }

  private close() {
    this.$bvModal.hide(this.id)
  }

  mounted() {
    bus.$on(EventBus.SHOW_SONG_FROM_URL_MODAL, (refreshCallback: () => void) => {
      this.refreshCallback = refreshCallback
      this.isLoggedIn = vxm.providers.youtubeProvider.loggedIn && vxm.providers.spotifyProvider.loggedIn
      this.$bvModal.show(this.id)
    })
  }
}
</script>

<style lang="sass" scoped>
.title
  font-size: 26px

.subtitle
  font-size: 14px
  font-weight: normal

.title.deactivated, .subtitle.deactivated
  color: var(--textSecondary)

.topbar-container
  background: var(--primary)
  height: 70px
  padding-left: calc(261px + 30px + 7.5px)

.song-url-cover
  width: 157px
  height: 157px
  object-fit: cover
  border-radius: 16px

.song-url-desc
  width: 100%
  background-color: transparent
  color: var(--textPrimary)
  border: 0
  padding: 0
  padding-left: 10px
  margin-top: 15px
  border-radius: 0
  border-left: 1px solid transparent
  &:focus
    -webkit-box-shadow: none
    box-shadow: none
  &:hover
    border-left: 1px solid var(--accent)

.song-url-details
  margin-top: -10px
  margin-left: 40px
  max-width: 100%

.songs-count
  font-size: 14px
  text-align: start

.edit-icon
  width: 15px
  height: 15px
  min-width: 15px
  min-height: 15px
  margin-left: 15px
  margin-top: 5px

.song-url-title
  font-size: 26px
  max-width: 100%
  margin-bottom: 15px !important
  color: var(--textPrimary)
  background-color: transparent
  border: 0
  border-bottom: 1px solid transparent
  border-radius: 0
  padding: 0
  &:hover
    border-bottom: 1px solid var(--accent)
  &:focus
    border-bottom: 1px solid var(--accent)
    outline: none
    -webkit-box-shadow: none

.create-button, .close-button
  font-size: 16px
  font-weight: 400
  color: var(--textInverse)
  background-color: var(--accent)
  border-radius: 6px
  float: right
  margin-bottom: 20px
  margin-top: 15px
  border: 0

.close-button
  background-color: var(--textPrimary)

.input-group
  margin-top: 15px
  margin-left: 10px

.warning
  color: #EB2525
</style>
