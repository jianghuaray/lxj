<template>
  <el-tooltip
    :content="displayText"
    :disabled="tooltipDisabled"
    placement="top"
    :show-after="250"
  >
    <span
      class="cell-text"
      :class="{ 'cell-text--two-line': lines === 2, 'cell-text--empty': isEmpty }"
      @click="$emit('click', $event)"
    >
      {{ displayText }}
    </span>
  </el-tooltip>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: [String, Number],
    default: ''
  },
  lines: {
    type: Number,
    default: 1
  },
  fallback: {
    type: String,
    default: '-'
  }
})

defineEmits(['click'])

const isEmpty = computed(() => props.value === null || props.value === undefined || props.value === '')
const displayText = computed(() => (isEmpty.value ? props.fallback : String(props.value)))
const tooltipDisabled = computed(() => isEmpty.value || displayText.value === props.fallback)
</script>

<style scoped>
.cell-text {
  display: block;
  max-width: 100%;
  overflow: hidden;
  line-height: 1.45;
  white-space: nowrap;
  mask-image: linear-gradient(to right, #000 82%, transparent);
  -webkit-mask-image: linear-gradient(to right, #000 82%, transparent);
}

.cell-text--two-line {
  display: -webkit-box;
  white-space: normal;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  mask-image: linear-gradient(to bottom, #000 68%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, #000 68%, transparent);
}

.cell-text--empty {
  color: var(--muted-fg);
  mask-image: none;
  -webkit-mask-image: none;
}
</style>
