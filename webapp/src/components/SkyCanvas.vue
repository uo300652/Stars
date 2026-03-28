<script setup>
import { ref, onMounted } from 'vue'
import Sky from '../js/Sky.js'

const emit = defineEmits(['star-selected', 'location-resolved'])

const canvasRef = ref(null)

onMounted(async () => {
  const sky = new Sky(canvasRef.value, {
    onStarSelected: (star) => emit('star-selected', star),
    onLocationResolved: (loc) => emit('location-resolved', loc),
  })
  await sky.init()
})
</script>

<template>
  <canvas ref="canvasRef" :class="$style.canvas" />
</template>

<style module>
.canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
