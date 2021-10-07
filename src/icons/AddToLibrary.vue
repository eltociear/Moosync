<template>
  <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <title>{{ title }}</title>
    <path
      d="M18.75 8.25H13.75V0.75H6.25V8.25H1.25L10 18.25L18.75 8.25ZM0 20.75H20V23.25H0V20.75Z"
      fill="var(--accent)"
    />
  </svg>
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator'

@Component({})
export default class PlainPlay extends Vue {
  @Prop({ default: '' })
  private title!: string
}
</script>
