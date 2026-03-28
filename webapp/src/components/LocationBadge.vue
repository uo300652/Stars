<script setup>
defineProps({
  location: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <div :class="$style.badge">
    <span :class="$style.name">{{ location.name }}</span>
    <span :class="$style.coords">
      {{ location.lat.toFixed(2) }}° &nbsp;{{ location.lon.toFixed(2) }}°
    </span>
  </div>
</template>

<style module>
.badge {
  position: absolute;
  top: 1rem;
  left: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
  padding: 0.5rem 0.875rem;
  background: rgba(0, 0, 0, 0.55);
  border: 0.0625rem solid rgba(255, 255, 255, 0.12);
  border-radius: 0.625rem;
  backdrop-filter: blur(0.375rem);
  pointer-events: none;
  user-select: none;
}

.name {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #ffffff;
  letter-spacing: 0.04em;
}

.coords {
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.45);
  font-variant-numeric: tabular-nums;
}

/* ── Tablet (≤ 720px) ── */
@media (max-width: 45rem) {
  .badge {
    top: 0.75rem;
    left: 0.75rem;
    padding: 0.375rem 0.75rem;
    gap: 0.125rem;
  }

  .name {
    font-size: 0.75rem;
  }

  .coords {
    font-size: 0.625rem;
  }
}

/* ── Mobile (≤ 480px) ── */
@media (max-width: 30rem) {
  .badge {
    top: 0.5rem;
    left: 0.5rem;
    padding: 0.3125rem 0.625rem;
    border-radius: 0.5rem;
  }

  .name {
    font-size: 0.6875rem;
  }

  .coords {
    font-size: 0.5625rem;
  }
}
</style>
