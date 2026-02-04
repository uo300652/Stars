<script setup>
  import { ref, onMounted } from 'vue'
  import Canvas from '../js/Canvas.js'

  const canvasRef = ref(null)
  let sky = null

  onMounted(async () => {
    sky = new Canvas(canvasRef.value)

    sky.resize()

    sky.limpiar()
    await sky.init()
    sky.dibujarEstrellas()
    sky.dibujarConstelaciones()
    sky.addListeners()
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
