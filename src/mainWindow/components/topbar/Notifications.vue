<template>
  <div>
    <NotificationIcon id="notification" class="notification-icon" />
    <b-popover :target="`notification`" placement="bottom" triggers="focus" custom-class="notification-popover">
      <div v-if="notifications.length !== 0" class="event-container">
        <div v-for="event in notifications" :key="event.id" class="event">
          <div class="event-body">{{ event.message }}</div>
        </div>
      </div>
      <div v-else class="default">No new notifications</div>
    </b-popover>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { vxm } from '@/mainWindow/store'
import NotificationIcon from '@/icons/Notification.vue'
@Component({
  components: {
    NotificationIcon
  }
})
export default class Notifications extends Vue {
  get notifications() {
    return vxm.notifier.notifications
  }
}
</script>

<style lang="sass">
.notification-popover
  background-color: var(--tertiary)
  border-radius: 16px
  border: none
  .arrow
    &::after
      border-bottom-color: var(--tertiary)
</style>

<style lang="sass" scoped>
.notification-icon
  height: 26px
  width: 26px

.default, .event-body
  color: var(--textPrimary)
</style>
