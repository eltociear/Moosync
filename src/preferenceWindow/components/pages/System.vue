<!-- 
  System.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <div>
    <b-container fluid>
      <b-row no-gutters class="w-100">
        <div class="path-selector w-100">
          <CheckboxGroup
            title="System Settings"
            tooltip="Settings which are related to your system"
            :isExtension="false"
            :defaultValue="checkboxValues"
            prefKey="system"
          />

          <EditText
            class="mt-5 mb-3"
            :isExtension="false"
            title="Spotify Client ID"
            prefKey="spotify.client_id"
            tooltip="Spotify client ID required to login to Spotify. Click to know more"
            @tooltipClick="openSpotifyHelp"
          />
          <EditText
            :isExtension="false"
            tooltip="Spotify client Secret required to login to Spotify. Click to know more"
            title="Spotify Client Secret"
            prefKey="spotify.client_secret"
            @tooltipClick="openSpotifyHelp"
          />

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
  </div>
</template>

<script lang="ts">
import { Component } from 'vue-property-decorator'
import Vue from 'vue'
import CheckboxGroup from '../CheckboxGroup.vue'
import EditText from '../EditText.vue'
import PreferenceHeader from '../PreferenceHeader.vue'

@Component({
  components: {
    CheckboxGroup,
    EditText,
    PreferenceHeader
  }
})
export default class System extends Vue {
  get checkboxValues() {
    return [this.startupCheckbox, this.minimizeToTrayCheckbox]
  }

  get youtubeEnvExists() {
    return !!(process.env.YoutubeClientID && process.env.YoutubeClientSecret)
  }

  get lastfmEnvExists() {
    return !!(process.env.LastFmApiKey && process.env.LastFmSecret)
  }

  get startupCheckbox() {
    return {
      key: 'startOnStartup',
      title: 'Start app on system startup',
      enabled: false
    }
  }

  get minimizeToTrayCheckbox() {
    return {
      key: 'minimizeToTray',
      title: 'Minimize to tray on close',
      enabled: true
    }
  }

  private openSpotifyHelp() {
    window.WindowUtils.openExternal('https://github.com/Moosync/Moosync#enabling-spotify-integration')
  }
}
</script>

<style lang="sass" scoped>
.path-selector
  max-width: 750px

.title
  text-align: left
</style>
