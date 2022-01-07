/* 
 *  AccountsMixin.ts is a part of Moosync.
 *  
 *  Copyright 2021 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License. 
 *  
 *  See LICENSE in the project root for license information.
 */

import { Component, Vue } from 'vue-property-decorator'
import { GenericAuth } from '@/utils/ui/providers/generics/genericAuth'
import { vxm } from '@/mainWindow/store'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'

type Providers = 'Youtube' | 'Spotify' | 'LastFM'

@Component
export default class AccountsMixin extends Vue {

  private _signoutProvider: any

  set signoutMethod(signout: (provider: Providers) => void) {
    this._signoutProvider = signout
  }

  get signoutMethod() {
    return this._signoutProvider
  }

  protected providers: {
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

  protected getProvider(provider: Providers) {
    return this.providers.find((val) => val.name === provider)
  }

  protected async getUserDetails(provider: Providers) {
    const p = this.getProvider(provider)
    if (p) {
      const username = await p?.provider.getUserDetails()
      this.$set(p, 'username', username)
      if (!p.username) {
        p.provider.signOut()
      }
    }
  }

  protected async handleClick(provider: Providers) {
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
      this._signoutProvider(provider)
    }
  }

  protected async login(provider: Providers) {
    const p = this.getProvider(provider)
    if (p) {
      if (await p.provider.login()) {
        try {
          await this.getUserDetails(p.name)
          bus.$emit(EventBus.REFRESH_USERNAMES, provider)

          if (p.name === 'LastFM') this.lastFm.scrobble(vxm.player.currentSong)
        } catch (_) {
          await p.provider.signOut()
        }
      }
    }
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

  mounted() {
    this.getUserDetails('Youtube')
    this.getUserDetails('Spotify')
    this.getUserDetails('LastFM')

    bus.$on(EventBus.REFRESH_USERNAMES, (provider: Providers) => {
      this.getUserDetails(provider)
    })
  }
}
