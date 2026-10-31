<script setup lang="ts">
import { ref } from 'vue'
import { useCodeCopy } from '../composables/useCodeCopy'

defineProps<{
  /** HTML from `renderPage`, already escaped and highlighted. */
  html: string
}>()

const container = ref<HTMLElement | null>(null)
useCodeCopy(container)
</script>

<template>
  <!--
    The copy buttons live inside the rendered HTML, so the click handler sits on
    this container and is delegated rather than attached per block.
  -->
  <div ref="container" class="prose" v-html="html" />
</template>
