<!-- 
  LowImageCol.vue is a part of Moosync.
  
  Copyright 2022 by Sahil Gupte <sahilsachingupte@gmail.com>. All rights reserved.
  Licensed under the GNU General Public License. 
  
  See LICENSE in the project root for license information.
-->

<template>
  <b-col cols="auto" class="img-container justify-content-around ms-auto" @click="emitClick">
    <div
      class="play-button me-auto justify-content-center d-flex align-items-center h-100 w-100"
      :style="{ height, width }"
    >
      <div class="play-icon">
        <Play2 />
      </div>
    </div>
    <img
      v-if="!forceEmptyImg"
      ref="cover"
      class="coverimg me-auto d-flex align-items-center"
      alt="cover img"
      :style="{ height, width }"
      :src="getImgSrc(src)"
      @error="handleCoverError"
    />
    <SongDefault :style="{ height, width }" v-else class="coverimg me-auto d-flex align-items-center" />
  </b-col>
</template>

<script lang="ts">
import ImgLoader from '@/utils/ui/mixins/ImageLoader'
import Component, { mixins } from 'vue-class-component'
import Play2 from '@/icons/PlayIcon2.vue'
import SongDefault from '@/icons/SongDefaultIcon.vue'
import { Prop, Watch } from 'vue-property-decorator'

@Component({
  components: {
    Play2,
    SongDefault
  }
})
export default class LowImageCol extends mixins(ImgLoader) {
  @Prop({ default: '' })
  private src!: string

  @Prop({ default: '' })
  private height!: string

  @Prop({ default: '' })
  private width!: string

  private forceEmptyImg = false

  @Watch('src')
  private onSrcChange() {
    this.forceEmptyImg = false
  }

  private handleCoverError() {
    this.forceEmptyImg = true
  }

  private emitClick() {
    this.$emit('imgClicked')
  }
}
</script>

<style lang="sass" scoped>
.img-container
  position: relative
  margin-right: 20px
  .coverimg
    border-radius: 10px
  &:hover
    .coverimg
      opacity: 0.2
    .play-button
      opacity: 1

.play-button
  position: absolute
  opacity: 0

.coverimg
  object-fit: cover
</style>
