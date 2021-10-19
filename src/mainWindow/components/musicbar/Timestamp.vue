<template>
  <b-row no-gutters align-v="center">
    <b-col cols="auto" class="timestamp">{{ formattedDuration(timestamp) }} </b-col>
    <b-col cols="auto" class="timestamp timestamp-extra">&nbsp;/ {{ formattedDuration(duration) }}</b-col>
  </b-row>
</template>

<script lang="ts">
import { Component, Vue, Prop } from 'vue-property-decorator'
import { convertDuration } from '@/utils/common'

@Component({})
export default class Timestamp extends Vue {
  @Prop({ default: 0 })
  private duration!: number

  @Prop({ default: 0 })
  private timestamp!: number

  private formattedDuration = convertDuration
}
</script>

<style lang="sass" scoped>
.timestamp
  color: var(--textSecondary)
  font-size: 16px
  overflow: hidden
</style>