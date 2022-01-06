<!-- 
  Accounts.vue is a part of Moosync.
  
  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div>
    <Person id="account" class="accounts-icon" />
    <b-popover :target="`account`" placement="bottom" triggers="focus" custom-class="accounts-popover">
      <div class="buttons">
        <IconButton
          v-for="p in providers"
          :key="`${p.name}-${p.username}`"
          :bgColor="p.bgColor"
          :hoverText="p.provider.loggedIn ? 'Sign out' : p.name"
          :title="p.username ? p.username : 'Connect'"
          @click.native="handleClick(p.name)"
        >
          <template slot="icon">
            <component :is="p.icon" />
          </template>
        </IconButton>
      </div>
    </b-popover>
    <ConfirmationModal keyword="signout from" :itemName="activeSignout" id="signoutModal" @confirm="signout" />
  </div>
</template>
<script lang="ts">
import IconButton from '@/mainWindow/components/generic/IconButton.vue'
import YoutubeIcon from '@/icons/Youtube.vue'
import SpotifyIcon from '@/icons/Spotify.vue'
import LastFMIcon from '@/icons/LastFM.vue'
import Person from '@/icons/Person.vue'
import { Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/mainWindow/store'
import ConfirmationModal from '../../../commonComponents/ConfirmationModal.vue'
import { GenericAuth } from '@/utils/ui/providers/generics/genericAuth'

type Providers = 'Youtube' | 'Spotify' | 'LastFM'
@Component({
  components: {
    IconButton,
    YoutubeIcon,
    SpotifyIcon,
    LastFMIcon,
    Person,
    ConfirmationModal
  }
})
export default class TopBar extends Vue {
  private activeSignout: Providers | null = null

  private providers: {
    name: Providers
    username: string | undefined
    bgColor: string
    icon: string
    provider: GenericAuth
  }[] = [
    {
      name: 'Youtube',
      bgColor: '#E62017',
      username: '',
      icon: 'YoutubeIcon',
      provider: this.youtube
    },
    {
      name: 'Spotify',
      bgColor: '#1ED760',
      username: '',
      icon: 'SpotifyIcon',
      provider: this.spotify
    },
    {
      name: 'LastFM',
      bgColor: '#BA0000',
      username: '',
      icon: 'LastFMIcon',
      provider: this.lastFm
    }
  ]

  private getProvider(provider: Providers) {
    return this.providers.find((val) => val.name === provider)
  }

  private async getUserDetails(provider: Providers) {
    const p = this.getProvider(provider)
    if (p) {
      const username = await p?.provider.getUserDetails()
      this.$set(p, 'username', username)
      if (!p.username) {
        p.provider.signOut()
      }
    }
  }

  private async handleClick(provider: Providers) {
    const p = this.getProvider(provider)
    if (p) {
      if (!p.provider.loggedIn) {
        const success = await p.provider.updateConfig()
        if (!success) {
          window.WindowUtils.openWindow(false, { page: 'system' })
          return
        }
        return this.login(provider)
      }
      this.showSignoutModal(provider)
    }
  }

  private async login(provider: Providers) {
    const p = this.getProvider(provider)
    if (p) {
      if (await p.provider.login()) {
        try {
          await this.getUserDetails(p.name)

          if (p.name === 'LastFM') this.lastFm.scrobble(vxm.player.currentSong)
        } catch (_) {
          await p.provider.signOut()
        }
      }
    }
  }

  mounted() {
    this.getUserDetails('Youtube')
    this.getUserDetails('Spotify')
    this.getUserDetails('LastFM')
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

  private async signout() {
    if (this.activeSignout) {
      const p = this.getProvider(this.activeSignout)

      if (p) {
        p.provider.signOut()

        this.$set(p, 'username', '')
        this.activeSignout = null
      }
    }
  }

  private showSignoutModal(signout: 'Youtube' | 'Spotify' | 'LastFM') {
    this.activeSignout = signout
    this.$bvModal.show('signoutModal')
  }
}
</script>

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
