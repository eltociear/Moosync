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

          <EditText class="mt-5 mb-3" :isExtension="false" title="Spotify Client ID" prefKey="spotify.client_id" />
          <EditText :isExtension="false" title="Spotify Client Secret" prefKey="spotify.client_secret" />
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
}
</script>

<style lang="sass" scoped>
.path-selector
  max-width: 750px

.title
  text-align: left
</style>
