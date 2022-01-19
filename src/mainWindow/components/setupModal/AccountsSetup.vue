<template>
  <b-container fluid class="p-0">
    <b-row>
      <b-col class="title-text mb-4"> Would you like to connect to any of these services? </b-col>
    </b-row>
    <b-row align-h="around">
      <b-col cols="auto">
        <YoutubeBig
          @click.native="handleClick('Youtube')"
          class="button-grow"
          :active="this.providers[0].provider.loggedIn"
        />
      </b-col>
      <b-col cols="auto">
        <SpotifyBig
          class="button-grow"
          @click.native="handleClick('Spotify')"
          :active="this.providers[1].provider.loggedIn"
        />
      </b-col>
      <b-col cols="auto">
        <LastFMBig
          class="button-grow"
          @click.native="handleClick('LastFM')"
          :active="this.providers[2].provider.loggedIn"
        />
      </b-col>
    </b-row>
    <b-row no-gutters align-h="end" class="button-row mt-3">
      <b-col cols="auto" class="mr-3">
        <b-button @click="skip" class="close-button">Prev</b-button>
      </b-col>
      <b-col cols="auto">
        <b-button @click="next" class="create-button">Close</b-button>
      </b-col>
    </b-row>
    <ConfirmationModal keyword="signout from" :itemName="activeSignout" id="signoutSetupModal" @confirm="signout" />
  </b-container>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component } from 'vue-property-decorator'
import Logo from '@/icons/Logo.vue'
import DirectoryGroup from '@/preferenceWindow/components/DirectoryGroup.vue'
import YoutubeBig from '@/icons/YoutubeBig.vue'
import SpotifyBig from '@/icons/SpotifyBig.vue'
import LastFMBig from '@/icons/LastFMBig.vue'
import { mixins } from 'vue-class-component'
import AccountsMixin from '@/utils/ui/mixins/AccountsMixin'
import ConfirmationModal from '../../../commonComponents/ConfirmationModal.vue'

type Providers = 'Youtube' | 'Spotify' | 'LastFM'

@Component({
  components: {
    Logo,
    DirectoryGroup,
    YoutubeBig,
    SpotifyBig,
    LastFMBig,
    ConfirmationModal
  }
})
export default class AccountsSetup extends mixins(AccountsMixin) {
  protected activeSignout: Providers | null = null

  mounted() {
    this.signoutMethod = this.showSignoutModal
  }

  private next() {
    this.$emit('next')
  }

  private skip() {
    this.$emit('prev')
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

  protected showSignoutModal(signout: 'Youtube' | 'Spotify' | 'LastFM') {
    this.activeSignout = signout
    this.$bvModal.show('signoutSetupModal')
  }
}
</script>

<style lang="sass">
.modal-dialog
  transition: all 0.4s cubic-bezier(0.71, -0.03, 0.32, 1.01), transform 0.3s ease-out !important
</style>

<style lang="sass" scoped>
.title-text
  margin-left: 15px
  font-size: 16px

.create-button, .close-button
  font-size: 16px
  font-weight: 400
  color: var(--textInverse)
  background-color: var(--accent)
  border-radius: 6px
  margin-bottom: 8px
  padding: 6px 20px 6px 20px
  margin-top: 15px
  border: 0

.close-button
  background-color: var(--textSecondary)
  color: var(--textPrimary)

.button-row
  margin-right: 15px
</style>


