<script setup>
defineProps({
  star: {
    type: Object,
    default: null,
  },
})

defineEmits(['close'])
</script>

<template>
  <Transition
    :enter-active-class="$style.enterActive"
    :enter-from-class="$style.enterFrom"
    :leave-active-class="$style.leaveActive"
    :leave-to-class="$style.leaveTo"
  >
    <div v-if="star" :class="$style.panel">
      <button :class="$style.close" @click="$emit('close')" aria-label="Close">✕</button>

      <p :class="$style.name">{{ star.proper || star.bf || `HR ${star.id}` }}</p>

      <dl :class="$style.details">
        <dt :class="$style.label">Magnitude</dt>
        <dd :class="$style.value">{{ star.mag.toFixed(2) }}</dd>

        <dt :class="$style.label">Constellation</dt>
        <dd :class="$style.value">{{ star.con || '—' }}</dd>
      </dl>
    </div>
  </Transition>
</template>

<style module>
/* ── Panel ── */
.panel {
  position: absolute;
  bottom: 1.75rem;
  left: 50%;
  transform: translateX(-50%);
  min-width: 14.375rem;
  padding: 1.125rem 1.375rem 1rem;
  background: rgba(5, 5, 20, 0.82);
  border: 0.0625rem solid rgba(100, 150, 255, 0.28);
  border-radius: 0.875rem;
  backdrop-filter: blur(0.625rem);
  color: #fff;
}

/* ── Close button ── */
.close {
  position: absolute;
  top: 0.625rem;
  right: 0.75rem;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  transition: color 0.15s;
}

.close:hover {
  color: #fff;
}

/* ── Star name ── */
.name {
  font-size: 1.1875rem;
  font-weight: 600;
  margin: 0 1.5rem 0.875rem 0;
  color: #b8ccff;
  letter-spacing: 0.02em;
}

/* ── Details grid ── */
.details {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.3125rem 1.125rem;
  margin: 0;
}

.label {
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.09em;
  align-self: center;
}

.value {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.82);
  font-variant-numeric: tabular-nums;
  margin: 0;
}

/* ── Slide-up transition ── */
.enterActive,
.leaveActive {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.enterFrom,
.leaveTo {
  opacity: 0;
  transform: translateX(-50%) translateY(0.75rem);
}

/* ── Tablet (≤ 720px) ── */
@media (max-width: 45rem) {
  .panel {
    bottom: 1.25rem;
    min-width: 12rem;
    padding: 1rem 1.125rem 0.875rem;
    border-radius: 0.75rem;
  }

  .name {
    font-size: 1.0625rem;
    margin-bottom: 0.75rem;
  }

  .label {
    font-size: 0.5625rem;
  }

  .value {
    font-size: 0.8125rem;
  }
}

/* ── Mobile (≤ 480px) ── */
@media (max-width: 30rem) {
  .panel {
    bottom: 0;
    left: 0;
    right: 0;
    transform: none;
    min-width: unset;
    width: 100%;
    border-radius: 0.875rem 0.875rem 0 0;
    padding: 1.25rem 1.25rem 2rem;
  }

  /* On mobile the enter/leave no longer needs translateX(-50%) */
  .enterFrom,
  .leaveTo {
    opacity: 0;
    transform: translateY(0.75rem);
  }

  .close {
    top: 0.75rem;
    right: 0.875rem;
    font-size: 1rem;
    padding: 0.25rem 0.375rem;
  }

  .name {
    font-size: 1.125rem;
  }

  .details {
    gap: 0.375rem 1rem;
  }

  .label {
    font-size: 0.625rem;
  }

  .value {
    font-size: 0.875rem;
  }
}
</style>
