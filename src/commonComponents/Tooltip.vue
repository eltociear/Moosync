<template>
  <div>
    <svg
      v-b-tooltip.hover.right
      :title="text"
      :id="tooltipId"
      width="7"
      height="12"
      viewBox="0 0 7 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3.248 8.04L4.224 7.624C3.952 7.416 3.792 7.096 3.792 6.84C3.792 5.272 6.896 5.064 6.896 2.648C6.896 1.272 5.712 0.167999 3.76 0.167999C2.24 0.167999 1.056 0.808 0.288 1.8L1.088 2.664C1.68 1.88 2.432 1.352 3.632 1.352C4.896 1.352 5.52 2.04 5.52 2.84C5.52 4.536 2.624 4.712 2.624 6.744C2.624 7.224 2.816 7.672 3.248 8.04ZM3.584 11.16C4.064 11.16 4.464 10.76 4.464 10.28C4.464 9.8 4.064 9.4 3.584 9.4C3.104 9.4 2.704 9.8 2.704 10.28C2.704 10.76 3.104 11.16 3.584 11.16Z"
        fill="white"
      />
    </svg>
  </div>
</template>

<script lang="ts">
import { Component, Prop } from 'vue-property-decorator'
import Vue from 'vue'

@Component({})
export default class Tooltip extends Vue {
  @Prop({ default: 'tooltip' })
  private tooltipId!: string

  @Prop({ default: 'This is a tooltip' })
  private text!: string
}
</script>
