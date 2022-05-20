<!-- 
  Accounts.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div>
    <Person id="account" class="accounts-icon" />
    <b-popover :target="`account`" placement="bottom" triggers="click blur" custom-class="accounts-popover">
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

        <IconButton
          v-for="a in extraAccounts"
          :key="a.id"
          :bgColor="a.bgColor"
          :hoverText="a.loggedIn ? 'Sign out' : a.name"
          :title="a.username ? a.username : 'Connect'"
          @click.native="handleExtensionAccountClick(a.id)"
        >
          <template slot="icon">
            <inline-svg class="provider-icon" v-if="a.icon.endsWith('svg')" :src="a.icon" />
            <img v-else :src="a.icon" alt="provider icon" class="provider-icon" />
          </template>
        </IconButton>
      </div>
    </b-popover>
    <ConfirmationModal keyword="signout from" :itemName="activeSignout" id="signoutModal" @confirm="signout" />
  </div>
</template>
<script lang="ts">
import IconButton from '@/mainWindow/components/generic/IconButton.vue'
import YoutubeIcon from '@/icons/YoutubeIcon.vue'
import SpotifyIcon from '@/icons/SpotifyIcon.vue'
import LastFMIcon from '@/icons/LastFMIcon.vue'
import Person from '@/icons/PersonIcon.vue'
import { Component } from 'vue-property-decorator'
import ConfirmationModal from '@/commonComponents/ConfirmationModal.vue'
import { mixins } from 'vue-class-component'
import AccountsMixin from '@/utils/ui/mixins/AccountsMixin'
import InvidiousIcon from '@/icons/InvidiousIcon.vue'

@Component({
  components: {
    IconButton,
    YoutubeIcon,
    InvidiousIcon,
    SpotifyIcon,
    LastFMIcon,
    Person,
    ConfirmationModal
  }
})
export default class TopBar extends mixins(AccountsMixin) {
  protected activeSignout: Providers | null = null

  async mounted() {
    this.signoutMethod = this.showSignoutModal
  }

  protected async signout() {
    if (this.activeSignout) {
      const p = this.getProvider(this.activeSignout)

      if (p) {
        p.provider.signOut()

        this.$set(p, 'username', '')
        this.activeSignout = null
      }
    }
  }

  protected showSignoutModal(signout: Providers) {
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
