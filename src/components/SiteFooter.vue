<script setup lang="ts">
import { site } from '../site'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-line/10">
    <div
      class="shell flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <p class="micro text-fg-dim">
        {{ site.author }} <span class="text-accent">/</span> {{ year }}
      </p>

      <p class="micro text-fg-dim">
        <a
          :href="site.repoUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-fg-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
        >
          Source
        </a>
      </p>

      <p class="micro text-fg-dim">Built with Vue and TypeScript</p>
    </div>
  </footer>
</template>
