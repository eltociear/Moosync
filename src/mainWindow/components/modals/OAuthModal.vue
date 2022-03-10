<!-- 
  OAuthModal.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-modal no-close-on-backdrop centered size="sm" :id="id" :ref="id" hide-footer hide-header>
    Waiting for response...
  </b-modal>
</template>

<script lang="ts">
import { EventBus } from '@/utils/main/ipc/constants'
import { Component, Prop, Vue } from 'vue-property-decorator'
import { bus } from '@/mainWindow/main'
import SongDefault from '@/icons/SongDefaultIcon.vue'

@Component({
  components: {
    SongDefault
  }
})
export default class OAuthModal extends Vue {
  @Prop({ default: 'OAuthModal' })
  private id!: string

  private title!: string
  private desc = ''

  private showing = false

  mounted() {
    bus.$on(EventBus.SHOW_OAUTH_MODAL, (title: string) => {
      if (!this.showing) {
        this.title = title
        this.$bvModal.show(this.id)
        this.showing = true
      }
    })

    bus.$on(EventBus.HIDE_OAUTH_MODAL, () => {
      if (this.showing) {
        this.$bvModal.hide(this.id)
        this.showing = false
      }
    })
  }
}
</script>

<style lang="sass" scoped></style>
