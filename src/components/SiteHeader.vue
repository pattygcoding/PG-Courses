<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import { nav, site } from '../site'
import IconLink from './IconLink.vue'
import ThemeToggle from './ThemeToggle.vue'

const route = useRoute()

/**
 * RouterLink's own active matching treats "/" as an ancestor of every route, so
 * the Home link would always be highlighted.  This keeps the rule explicit.
 */
function isActive(to: string): boolean {
  if (to === '/') {
    return route.path === '/'
  }
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-line/5 bg-ink-900/80 backdrop-blur">
    <div class="shell flex flex-wrap items-center gap-x-4 gap-y-3 py-3">
      <RouterLink
        to="/"
        class="micro text-fg-dim transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
      >
        {{ site.brand }}
      </RouterLink>

      <!-- Wraps to its own row on phones, then sits inline from `sm` up. -->
      <nav class="order-3 w-full sm:order-none sm:ml-6 sm:w-auto" aria-label="Primary">
        <ul class="flex list-none flex-wrap items-center gap-x-5 gap-y-2 p-0">
          <li v-for="item in nav" :key="item.to">
            <RouterLink
              :to="item.to"
              class="micro transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
              :class="isActive(item.to) ? 'text-accent' : 'text-fg-muted'"
              :aria-current="isActive(item.to) ? 'page' : undefined"
            >
              {{ item.label }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <IconLink
          :href="site.portfolioUrl"
          label="Back to pattygcoding.com"
          title="pattygcoding.com"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </IconLink>

        <IconLink :href="site.repoUrl" label="PG-Courses on GitHub" title="PG-Courses on GitHub">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
            />
            <path d="M9 18c-4.51 2-5-2-7-2" />
          </svg>
        </IconLink>

        <ThemeToggle />
      </div>
    </div>
  </header>
</template>
