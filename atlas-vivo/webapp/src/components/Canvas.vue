<script setup>
  import { ref, onMounted } from 'vue'
  import Sky from '../js/Sky.js'

  const canvasRef = ref(null)

  onMounted(async () => {
    const sky = new Sky(canvasRef.value)
    await sky.init()
  })
</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>

<style scoped>
canvas {
  border: 1px solid #333;
  width: 100%;
  height: 100vh; /* toda la altura de la ventana */
  display: block; /* quita espacios raros */
}
</style>
