<script setup lang="ts">
import SiteFooter from './components/SiteFooter.vue'
import SiteHeader from './components/SiteHeader.vue'
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <SiteHeader />
    <!--
      Landing page body. It is intentionally empty for now: the shell, the
      palette and the theme toggle are the design, and lesson content lands
      here once the Markdown pipeline exists.
    -->
    <main id="main" class="flex-1" />
    <SiteFooter />
  </div>
</template>
