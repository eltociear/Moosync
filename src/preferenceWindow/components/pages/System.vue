<!-- 
  System.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div class="w-100 h-100">
    <b-container fluid>
      <b-row no-gutters class="w-100">
        <div class="path-selector w-100">
          <CheckboxGroup
            title="System Settings"
            tooltip="Settings which are related to your system"
            :isExtension="false"
            :defaultValue="checkboxValues"
            :onValueChange="onSystemPrefChange"
            :onValueFetch="onSystemPrefFetch"
            prefKey="system"
          />

          <b-row v-if="showRestartButton">
            <b-col cols="auto">
              <b-button class="create-button" @click="restartApp">Restart Moosync</b-button>
            </b-col>
          </b-row>

          <EditText
            class="mt-5 mb-3"
            :isExtension="false"
            title="Zoom Factor (Beta)"
            prefKey="zoomFactor"
            tooltip="Zoom of windows in percentage. This may break the UI."
            :onValueChange="onZoomUpdate"
            defaultValue="100"
            type="number"
          />

          <EditText
            class="mt-5 mb-3"
            :isExtension="false"
            title="Spotify Client ID"
            prefKey="spotify.client_id"
            tooltip="Spotify client ID required to login to Spotify. Click to know more"
            @tooltipClick="openSpotifyHelp"
            :key="spotifyIDKey"
            :onValueFetch="onSpotifyValueFetch"
            :onValueChange="onSpotifyValueFetch"
          />
          <EditText
            :isExtension="false"
            tooltip="Spotify client Secret required to login to Spotify. Click to know more"
            title="Spotify Client Secret"
            prefKey="spotify.client_secret"
            @tooltipClick="openSpotifyHelp"
            :key="spotifySecretKey"
            :onValueFetch="onSpotifyValueFetch"
            :onValueChange="onSpotifyValueFetch"
          />

          <b-row v-if="showSpotifyButton">
            <b-col cols="auto">
              <b-button class="create-button" @click="showSpotifyAutomateDisclaimer"
                >Get Spotify details automatically</b-button
              >
            </b-col>
          </b-row>

          <EditText
            v-if="!youtubeEnvExists"
            class="mt-5 mb-3"
            :isExtension="false"
            title="Youtube Client ID"
            prefKey="youtube.client_id"
          />
          <EditText
            v-if="!youtubeEnvExists"
            :isExtension="false"
            title="Youtube Client Secret"
            prefKey="youtube.client_secret"
          />

          <EditText
            v-if="!lastfmEnvExists"
            class="mt-5 mb-3"
            :isExtension="false"
            title="LastFM API Key"
            prefKey="lastfm.client_id"
          />
          <EditText
            v-if="!lastfmEnvExists"
            :isExtension="false"
            title="LastFM Client Secret"
            prefKey="lastfm.client_secret"
          />
        </div>
      </b-row>
    </b-container>
    <b-modal no-close-on-backdrop centered size="md" id="spotify-automate-modal" hide-footer hide-header>
      <b-container class="response-container">
        <b-row no-gutters class="d-flex">
          <b-col class="title" cols="auto">Get</b-col>
          <b-col class="title ml-2" cols="auto" :style="{ color: '#1ED760' }">Spotify</b-col>
          <b-col class="title ml-2" cols="auto">ClientID and Secret</b-col>
        </b-row>
        <b-row>
          <b-col class="mt-4 waiting"
            >A window will now open where you will be asked to login to your Spotify account. After logging in please do
            not click anywhere as the whole process will be automated</b-col
          >
        </b-row>
        <b-row>
          <b-col class="d-flex justify-content-center">
            <div
              @click="openSpotifyAutomation"
              class="start-button button-grow mt-4 d-flex justify-content-center align-items-center"
            >
              Open Window
            </div>
          </b-col>
        </b-row>
      </b-container>
      <CrossIcon @click.native="closeModal" class="close-icon button-grow" />
    </b-modal>
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import Vue from 'vue'
import CheckboxGroup from '../CheckboxGroup.vue'
import EditText from '../EditText.vue'
import PreferenceHeader from '../PreferenceHeader.vue'
import CrossIcon from '@/icons/CrossIcon.vue'

@Component({
  components: {
    CheckboxGroup,
    EditText,
    PreferenceHeader,
    CrossIcon
  }
})
export default class System extends Vue {
  private spotifyIDKey = 10
  private spotifySecretKey = 100
  private showSpotifyButton = false
  private showRestartButton = false

  private defaultHardwareAcceleration = true

  get checkboxValues(): SystemSettings[] {
    return [this.startupCheckbox, this.minimizeToTrayCheckbox, this.hardwareAcceleration, this.watchFileChanges]
  }

  get youtubeEnvExists() {
    return !!(process.env.YoutubeClientID && process.env.YoutubeClientSecret)
  }

  get lastfmEnvExists() {
    return !!(process.env.LastFmApiKey && process.env.LastFmSecret)
  }

  get startupCheckbox(): SystemSettings {
    return {
      key: 'startOnStartup',
      title: 'Start app on system startup',
      enabled: false
    }
  }

  get minimizeToTrayCheckbox(): SystemSettings {
    return {
      key: 'minimizeToTray',
      title: 'Minimize to tray on close',
      enabled: true
    }
  }

  get hardwareAcceleration(): SystemSettings {
    return {
      key: 'hardwareAcceleration',
      title: 'Use GPU hardware acceleration',
      enabled: true
    }
  }

  get watchFileChanges(): SystemSettings {
    return {
      key: 'watchFileChanges',
      title: 'Watch music directories for changes',
      enabled: false
    }
  }

  private openSpotifyHelp() {
    window.WindowUtils.openExternal('https://github.com/Moosync/Moosync#enabling-spotify-integration')
  }

  private closeModal() {
    this.$bvModal.hide('spotify-automate-modal')
  }

  private onSystemPrefFetch(value: SystemSettings[]) {
    if (Array.isArray(value)) {
      const data = value.find((val) => val.key === 'hardwareAcceleration')
      this.defaultHardwareAcceleration = data?.enabled ?? true
    }
  }

  private onSystemPrefChange(value: SystemSettings[]) {
    if (Array.isArray(value)) {
      const data = value.find((val) => val.key === 'hardwareAcceleration')
      if (data?.enabled !== this.defaultHardwareAcceleration) {
        this.showRestartButton = true
      } else {
        this.showRestartButton = false
      }
    }
  }

  private async restartApp() {
    await window.WindowUtils.restartApp()
  }

  private onSpotifyValueFetch(value: string) {
    if (!value) {
      this.showSpotifyButton = true
    } else {
      this.showSpotifyButton = false
    }
  }

  private showSpotifyAutomateDisclaimer() {
    this.$bvModal.show('spotify-automate-modal')
  }

  private async openSpotifyAutomation() {
    const data = await window.WindowUtils.automateSpotify()
    this.closeModal()

    if (data) {
      window.PreferenceUtils.saveSelective('spotify.client_id', data.clientID, false)
      window.PreferenceUtils.saveSelective('spotify.client_secret', data.clientSecret, false)

      this.spotifyIDKey += 1
      this.spotifySecretKey += 1
    }
  }

  private async onZoomUpdate() {
    await window.WindowUtils.updateZoom()
  }
}
</script>

<style lang="sass" scoped>
.path-selector
  max-width: 750px

.title
  text-align: left

.create-button
  font-size: 16px
  font-weight: 400
  color: var(--textInverse)
  background-color: var(--accent)
  border-radius: 6px
  margin-bottom: 8px
  margin-left: 15px
  padding: 6px 20px 6px 20px
  margin-top: 30px
  border: 0

.close-icon
  position: absolute
  top: 20px
  right: 20px
  width: 14px
  height: 14px
</style>
