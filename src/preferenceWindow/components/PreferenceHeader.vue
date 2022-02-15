<!-- 
  PreferenceHeader.vue is a part of Moosync.
  
  Copyright 2021-2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-row no-gutters>
    <b-col cols="auto" align-self="center" class="title d-flex">
      <div class="preference-title">{{ title }}</div>
      <div class="ml-2 tooltip-pos">
        <Tooltip :text="tooltip" />
      </div>
    </b-col>
  </b-row>
</template>

<script lang="ts">
import Tooltip from '@/commonComponents/Tooltip.vue'
import { Component, Prop, Vue } from 'vue-property-decorator'

@Component({
  components: { Tooltip }
})
export default class PreferenceHeader extends Vue {
  @Prop()
  private title!: string

  @Prop()
  private tooltip!: string
}
</script>

<style lang="sass" scoped>
.preference-title
  font-weight: normal
  font-size: 20px
  color: var(--textPrimary)

.tooltip-pos
  margin-top: 2px
</style>
