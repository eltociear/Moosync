<!-- 
  OAuthModal.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-modal no-close-on-backdrop centered size="sm" :id="id" :ref="id" hide-footer hide-header>
    <b-container class="response-container">
      <b-row no-gutters class="d-flex">
        <b-col class="title" cols="auto">Logging in to</b-col>
        <b-col class="title ml-1" cols="auto" :style="{ color: textColor }">{{ title }}</b-col>
      </b-row>
      <b-row>
        <b-col class="mt-4 waiting">Waiting for response from your browser...</b-col>
      </b-row>
      <b-row>
        <b-col class="d-flex justify-content-center">
          <div
            @click="openBrowser"
            class="start-button button-grow mt-4 d-flex justify-content-center align-items-center"
          >
            Open browser
          </div>
        </b-col>
      </b-row>
    </b-container>
    <CrossIcon @click.native="close" class="close-icon button-grow" />
  </b-modal>
</template>

<script lang="ts">
import { EventBus } from '@/utils/main/ipc/constants'
import { Component, Prop, Vue } from 'vue-property-decorator'
import { bus } from '@/mainWindow/main'
import SongDefault from '@/icons/SongDefaultIcon.vue'
import CrossIcon from '@/icons/CrossIcon.vue'

@Component({
  components: {
    SongDefault,
    CrossIcon
  }
})
export default class OAuthModal extends Vue {
  @Prop({ default: 'OAuthModal' })
  private id!: string

  private textColor = ''
  private title = ''
  private url = ''

  private showing = false

  private openBrowser() {
    window.WindowUtils.openExternal(this.url)
  }

  private close() {
    bus.$emit(EventBus.HIDE_OAUTH_MODAL)
  }

  mounted() {
    bus.$on(EventBus.SHOW_OAUTH_MODAL, (title: string, url: string, textColor: string) => {
      if (!this.showing) {
        this.title = title
        this.textColor = textColor
        this.url = url
        this.$bvModal.show(this.id)
        this.showing = true
      }
    })

    bus.$on(EventBus.HIDE_OAUTH_MODAL, () => {
      if (this.showing) {
        this.$bvModal.hide(this.id)
        this.title = ''
        this.textColor = ''
        this.url = ''
        this.showing = false
      }
    })
  }
}
</script>

<style lang="sass" scoped>
.title
  font-size: 20px
  font-weight: 700

.waiting
  font-size: 16px
  font-weight: 700

.response-container
  padding: 10px

.close-icon
  position: absolute
  top: 20px
  right: 20px
  width: 14px
  height: 14px

.start-button
  width: 135px
  height: 36px
  border: 1px solid #65CB88
  border-radius: 6px
  font-size: 16px
</style>
