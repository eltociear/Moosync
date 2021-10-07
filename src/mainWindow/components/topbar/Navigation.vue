<template>
  <b-row class="justify-content-between">
    <b-col cols="6" @click="back">
      <NavBack />
    </b-col>
    <b-col cols="6" @click="forward">
      <NavForward />
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import NavBack from '@/icons/NavBack.vue'
import NavForward from '@/icons/NavForward.vue'

@Component({
  components: {
    NavBack,
    NavForward
  }
})
export default class Notifications extends Vue {
  private forward() {
    this.$router.forward()
  }

  private back() {
    this.$router.back()
  }
}
</script>
