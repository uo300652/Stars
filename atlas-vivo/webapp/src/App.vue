<script setup>
import { ref } from 'vue'
import SkyCanvas from './components/SkyCanvas.vue'
import LocationBadge from './components/LocationBadge.vue'
import StarInfo from './components/StarInfo.vue'

const selectedStar = ref(null)
const location = ref({ name: 'California', lat: 37.4220, lon: -122.0841 })
</script>

<template>
  <div :class="$style.app">
    <SkyCanvas
      @star-selected="selectedStar = $event"
      @location-resolved="location = $event"
    />
    <LocationBadge :location="location" />
    <StarInfo :star="selectedStar" @close="selectedStar = null" />
  </div>
</template>

<style module>
.app {
  position: relative;
  width: 100vw;
  height: 100vh;     /* fallback for older browsers */
  height: 100dvh;    /* dynamic viewport height: shrinks when mobile address bar is visible */
  overflow: hidden;
  background: #000;
}
</style>
