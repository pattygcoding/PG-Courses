<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { site } from '../site'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="mt-16 border-t border-line/10">
    <div
      class="shell flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <p class="micro text-fg-dim">
        {{ site.author }} <span class="text-accent">/</span> {{ year }}
      </p>

      <nav aria-label="Footer">
        <ul class="flex list-none flex-wrap items-center gap-x-5 gap-y-2 p-0">
          <li>
            <RouterLink
              to="/courses"
              class="micro text-fg-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
            >
              Courses
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/about"
              class="micro text-fg-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
            >
              About
            </RouterLink>
          </li>
          <li>
            <a
              :href="site.repoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="micro text-fg-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
            >
              Source
            </a>
          </li>
        </ul>
      </nav>

      <p class="micro text-fg-dim">Built with Vue and TypeScript</p>
    </div>
  </footer>
</template>
