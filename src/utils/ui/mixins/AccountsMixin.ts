/*
 *  AccountsMixin.ts is a part of Moosync.
 *
 *  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
 *  Licensed under the GNU General Public License.
 *
 *  See LICENSE in the project root for license information.
 */

import { Component, Vue } from 'vue-property-decorator'
import { GenericAuth } from '@/utils/ui/providers/generics/genericAuth'
import { vxm } from '@/mainWindow/store'
import { bus } from '@/mainWindow/main'
import { EventBus } from '@/utils/main/ipc/constants'

@Component
export default class AccountsMixin extends Vue {
  private _signoutProvider?: (provider: Providers) => void

  protected extraAccounts: StrippedAccountDetails[] = []

  set signoutMethod(signout: ((provider: Providers) => void) | undefined) {
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
      name: this.useInvidious ? 'Invidious' : 'Youtube',
      bgColor: this.useInvidious ? '#00B6F0' : '#E62017',
      username: '',
      icon: this.useInvidious ? 'InvidiousIcon' : 'YoutubeIcon',
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

  private get useInvidious() {
    return vxm.providers.useInvidious
  }

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
      if (!(await p.provider.getLoggedIn())) {
        const success = await p.provider.updateConfig()
        if (!success) {
          window.WindowUtils.openWindow(false, { page: 'system' })
          return
        }
        return this.login(provider)
      }
      this._signoutProvider && this._signoutProvider(provider)
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
        } catch (e) {
          console.error(e)
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

  protected handleExtensionAccountClick(id: string) {
    const account = this.extraAccounts.find((val) => val.id === id)
    if (account) {
      window.ExtensionUtils.performAccountLogin(account.packageName, account.id, !account.loggedIn).then(() =>
        console.debug('performed login for', account.packageName)
      )
    }
  }

  async mounted() {
    this.getUserDetails('Youtube')
    this.getUserDetails('Spotify')
    this.getUserDetails('LastFM')

    vxm.providers.$watch(
      'useInvidious',
      (val) => {
        this.getUserDetails(val ? 'Invidious' : 'Youtube')
      },
      { immediate: true, deep: false }
    )

    bus.$on(EventBus.REFRESH_USERNAMES, (provider: Providers) => {
      this.getUserDetails(provider)
    })

    await this.findAccounts()
    window.ExtensionUtils.listenExtensionsChanged(() => {
      this.extraAccounts = []
      this.findAccounts()
    })

    window.ExtensionUtils.listenAccountRegistered(async (details) => {
      details.data.icon = await this.getAccountIcon(details.data)
      const existing = this.extraAccounts.findIndex((val) => val.id === details.data.id)

      if (existing === -1) {
        this.extraAccounts.push(details.data)
      } else {
        this.extraAccounts.splice(existing, 1, details.data)
      }
    })
  }

  private async findAccounts() {
    const extensionAccounts = await window.ExtensionUtils.getRegisteredAccounts()
    for (const value of Object.values(extensionAccounts)) {
      for (const v of value) {
        if (!this.extraAccounts.find((val) => val.id === v.id)) {
          v.icon = await this.getAccountIcon(v)
          this.extraAccounts.push(v)
        }
      }
    }
  }

  private async getAccountIcon(account: StrippedAccountDetails) {
    let icon = account.icon
    if (icon) {
      icon = await window.ExtensionUtils.getExtensionIcon(account.packageName)
    }

    if (!icon.startsWith('http')) {
      return 'media://' + icon
    }
    return icon
  }
}
