<template>
  <div>
    <Person id="account" class="accounts-icon" />
    <b-popover :target="`account`" placement="bottom" triggers="focus" custom-class="accounts-popover">
      <div class="buttons">
        <IconButton
          @click.native="handleYoutubeClick"
          bgColor="#E62017"
          :title="youtubeName ? youtubeName : 'Connect'"
          :hoverText="youtube.loggedIn ? 'Sign Out' : 'Youtube'"
        >
          <template slot="icon"> <YoutubeIcon /> </template>
        </IconButton>
        <IconButton
          @click.native="handleSpotifyClick"
          bgColor="#1ED760"
          :title="spotifyName ? spotifyName : 'Connect'"
          :hoverText="spotify.loggedIn ? 'Sign Out' : 'Spotify'"
        >
          <template slot="icon"> <SpotifyIcon /> </template>
        </IconButton>
        <IconButton
          @click.native="handleLastFmClick"
          bgColor="#BA0000"
          :title="lastFmName ? lastFmName : 'Connect'"
          :hoverText="spotify.loggedIn ? 'Sign Out' : 'LastFM'"
        >
          <template slot="icon"> <LastFMIcon /> </template>
        </IconButton>
        <IconButton bgColor="#737373" title="Settings" @click.native="openSettings">
          <template slot="icon"> <GearIcon /> </template>
        </IconButton>
      </div>
    </b-popover>
  </div>
</template>
<script lang="ts">
import IconButton from '@/mainWindow/components/generic/IconButton.vue'
import YoutubeIcon from '@/icons/Youtube.vue'
import SpotifyIcon from '@/icons/Spotify.vue'
import LastFMIcon from '@/icons/LastFM.vue'
import GearIcon from '@/icons/Gears.vue'
import Person from '@/icons/Person.vue'
import { Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/mainWindow/store'
@Component({
  components: {
    IconButton,
    YoutubeIcon,
    SpotifyIcon,
    LastFMIcon,
    GearIcon,
    Person
  }
})
export default class TopBar extends Vue {
  private youtubeName = ''

  private spotifyName = ''

  private lastFmName = ''

  mounted() {
    this.getUserDetailsYoutube()
    this.getUserDetailsSpotify()
    this.getUserDetailsLastFM()
  }

  get youtube() {
    return vxm.providers.youtubeProvider
  }

  get spotify() {
    return vxm.providers.spotifyProvider
  }

  get lastFm() {
    return vxm.providers.lastfmProvider
  }

  private async handleSpotifyClick() {
    const tmp = (await window.PreferenceUtils.loadSelective('spotify')) as { client_id: string; client_secret: string }
    if (tmp.client_id && tmp.client_secret) {
      if (!this.spotify.loggedIn) {
        await this.spotify.updateConfig()
        this.loginSpotify()
        return
      }
      this.signOutSpotify()
    } else {
      window.WindowUtils.openWindow(false, { page: 'system' })
    }
  }

  private async handleLastFmClick() {
    if (!this.lastFm.loggedIn) {
      this.loginLastFM()
      return
    }
    this.signOutLastFM()
  }

  private async signOutLastFM() {
    await this.lastFm.signOut()
    this.lastFmName = ''
  }

  private async loginLastFM() {
    if (await this.lastFm.login()) {
      try {
        await this.getUserDetailsLastFM()
        this.lastFm.scrobble(vxm.player.currentSong)
      } catch (_) {
        await this.lastFm.signOut()
      }
    }
  }

  private async loginSpotify() {
    await this.spotify.login()
    try {
      await this.getUserDetailsSpotify()
    } catch (_) {
      await this.spotify.signOut()
    }
  }

  private async signOutSpotify() {
    await this.spotify.signOut()
    this.spotifyName = ''
  }

  private async getUserDetailsSpotify() {
    const name = await this.spotify.getUserDetails()
    if (name) {
      this.spotifyName = name
      return
    }
    this.lastFm.signOut()
  }

  private async getUserDetailsLastFM() {
    const name = await this.lastFm.getUserDetails()
    if (name) {
      this.lastFmName = name
      return
    }
    this.lastFm.signOut()
  }

  private handleYoutubeClick() {
    if (!this.youtube.loggedIn) {
      this.loginYoutube()
      return
    }
    this.signOutYoutube()
  }

  private async getUserDetailsYoutube() {
    const name = await this.youtube.getUserDetails()
    if (name) {
      this.youtubeName = name
      return
    }
    this.youtube.signOut()
  }

  private async loginYoutube() {
    await this.youtube.login()

    try {
      this.getUserDetailsYoutube()
    } catch (_) {
      await this.youtube.signOut()
    }
  }

  private async signOutYoutube() {
    await this.youtube.signOut()
    this.youtubeName = ''
  }

  private openSettings() {
    window.WindowUtils.openWindow(false)
  }
}
</script>

<style lang="sass">
.accounts-popover
  background-color: var(--tertiary)
  border-radius: 16px
  width: 300px
  border: none
  .arrow
    &::after
      border-bottom-color: var(--tertiary)
</style>

<style lang="sass" scoped>
.accounts-icon
  height: 22px
  width: 22px
  margin-left: 0.5rem

.buttons
  > div
    margin-bottom: 8px
    &:first-child
      margin-top: 15px
</style>
