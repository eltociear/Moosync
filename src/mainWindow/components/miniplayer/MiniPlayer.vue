<template>
  <div>
    <div class="h-100 w-100 img-container">
      <div v-if="computedImg" class="dark-overlay" :style="{ top: !hasFrame ? '-28px' : '0px' }"></div>
      <transition
        name="custom-fade"
        enter-active-class="animate__animated animate__fadeIn"
        leave-active-class="animate__animated animate__fadeOut animate__faster"
      >
        <b-img
          class="bg-img"
          v-if="computedImg"
          :src="computedImg"
          :key="computedImg"
          referrerPolicy="no-referrer"
        ></b-img>
      </transition>
    </div>
    <b-container>
      <b-row>
        <b-col class="song-details">
          <b-row>
            <b-col class="text-truncate">
              <b-row align-h="start" align-v="center">
                <b-col cols="auto" class="w-100 d-flex">
                  <div id="musicbar-title" :title="currentSong.title" class="text song-title text-truncate mr-2">
                    {{ currentSong.title }}
                  </div>

                  <YoutubeIcon
                    v-if="iconType === 'YOUTUBE'"
                    :color="'#E62017'"
                    :filled="true"
                    :dropShadow="true"
                    class="provider-icon"
                  />
                  <SpotifyIcon
                    v-if="iconType === 'SPOTIFY'"
                    :color="'#1ED760'"
                    :filled="true"
                    :dropShadow="true"
                    class="provider-icon"
                  />

                  <inline-svg
                    class="provider-icon"
                    v-if="iconURL && iconType === 'URL' && iconURL.endsWith('svg')"
                    :src="iconURL"
                  />
                  <img
                    referrerPolicy="no-referrer"
                    v-if="iconURL && iconType === 'URL' && !iconURL.endsWith('svg')"
                    :src="iconURL"
                    alt="provider icon"
                    class="provider-icon"
                  />
                </b-col>
              </b-row>
              <b-row no-gutters>
                <b-col class="d-flex">
                  <div
                    v-for="(artist, index) of currentSong.artists"
                    :key="index"
                    :title="artist.artist_name"
                    class="text song-subtitle text-truncate"
                    :class="index !== 0 ? 'ml-1' : ''"
                  >
                    {{ artist.artist_name }}{{ index !== currentSong.artists.length - 1 ? ',' : '' }}
                  </div>
                </b-col>
              </b-row>
            </b-col>
          </b-row>
        </b-col>
      </b-row>
    </b-container>
  </div>
</template>

<script lang="ts">
import { vxm } from '@/mainWindow/store'
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import { mixins } from 'vue-class-component'
import { Component, Watch } from 'vue-property-decorator'
import SpotifyIcon from '@/icons/SpotifyIcon.vue'
import YoutubeIcon from '@/icons/YoutubeIcon.vue'

@Component({
  components: {
    SpotifyIcon,
    YoutubeIcon
  }
})
export default class App extends mixins(ImgLoader) {
  private hasFrame = false
  private forceDefaultImg = false

  private iconType = ''
  private iconURL = ''

  private get currentSong() {
    return vxm.player.currentSong
  }

  get computedImg() {
    this.forceDefaultImg = false
    return this.getImgSrc(this.getValidImageHigh(this.currentSong))
  }

  async created() {
    this.hasFrame = await window.WindowUtils.hasFrame()
    this.iconType = (await this.getIconType()) ?? ''
  }

  private async getIconType() {
    this.iconURL = ''

    if (this.currentSong) {
      if (this.currentSong.icon) {
        this.iconURL = 'media://' + this.currentSong.icon
        return 'URL'
      }

      if (this.currentSong.providerExtension) {
        const icon = await window.ExtensionUtils.getExtensionIcon(this.currentSong.providerExtension)
        if (icon) {
          this.iconURL = 'media://' + icon
          return 'URL'
        }
      }

      return this.currentSong.type
    }

    return ''
  }

  @Watch('currentSong')
  private async onCurrentSongChange() {
    this.iconType = (await this.getIconType()) ?? ''
    console.log(this.iconType)
  }
}
</script>

<style lang="sass" scoped>
.img-container
  position: absolute

.dark-overlay
  height: calc(100% + 28px + 5px + 3px)
  width: 100vw
  position: absolute
  left: 0
  background: rgba(0,0,0,.75)

.song-details
  text-align: left
  margin-top: 30px
  padding-left: 15px
  padding-right: 15px

.text
  text-align: left
  font-weight: normal
  line-height: 170.19%

.song-title
  font-weight: 700
  font-size: 21.434px
  width: fit-content

.song-subtitle
  font-weight: 300
  font-size: 16.0755px
  width: fit-content
  text-decoration: none
  &:hover
    text-decoration: underline
</style>
