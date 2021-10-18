<template>
  <tr height="60">
    <td class="title pr-5">
      {{ title }}
    </td>
    <td class="pr-4" ref="parent">
      <div class="color-box" @click="toggleColorPicker" :style="{ background: color }"></div>
    </td>
    <td>
      <color-picker
        v-click-outside="hideColorPicker"
        v-if="showColorPicker"
        :style="{ left: `${pickerPosition[0]}px`, top: `${pickerPosition[1]}px` }"
        class="color-picker"
        theme="dark"
        :color="color"
        :sucker-hide="false"
        :sucker-area="[]"
        @changeColor="changeColor"
      />
    </td>
  </tr>
</template>

<script lang="ts">
import { Component, Prop, Watch } from 'vue-property-decorator'
import Vue from 'vue'
import ColorPalette from '@/icons/ColorPalette.vue'
import colorPicker from '@caohenghu/vue-colorpicker'

@Component({
  components: {
    ColorPalette,
    colorPicker
  }
})
export default class ColorPicker extends Vue {
  @Prop({ default: 'Primary' })
  private title!: string

  private showColorPicker: boolean = false
  private pickerPosition = [0, 0]

  @Prop({ default: '#ffffff' })
  private defColor!: string

  @Watch('defColor') onDefaultChange() {
    this.color = this.defColor
  }

  private color: string = ''

  private hideColorPicker() {
    this.showColorPicker = false
  }

  public toggleColorPicker(mouseEvent?: PointerEvent) {
    const parent = this.$refs['parent'] as HTMLDivElement
    this.pickerPosition = [parent.offsetLeft + 40, parent.offsetTop + 40]
    if (mouseEvent) {
      this.pickerPosition[0] += mouseEvent.offsetX
      this.pickerPosition[1] += mouseEvent.offsetY
    } else {
      this.pickerPosition[0] += 30
      this.pickerPosition[1] += 15
    }
    this.showColorPicker = !this.showColorPicker
  }

  private changeColor(color: any) {
    this.color = color.hex
    this.$emit('colorChange', color.hex)
  }

  created() {
    this.color = this.defColor
  }
}
</script>

<style lang="sass" scoped>
.color-box
  width: 90px
  height: 40px
  border-radius: 4px
  border: 0.61px solid var(--textPrimary)

.title
  text-align: left

.icon
  width: 20px
  height: 20px
  margin-top: -8px

.color-picker
  position: absolute
  z-index: 999
</style>
