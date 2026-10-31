<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { nav } from '../site'
</script>

<template>
  <div class="shell py-20 sm:py-28">
    <p class="micro text-accent">Error 404</p>
    <h1 class="mt-4 text-4xl font-semibold leading-tight tracking-tight text-fg-strong sm:text-5xl">
      This page does not exist
    </h1>
    <p class="mt-5 max-w-xl text-sm leading-relaxed text-fg-muted sm:text-base">
      The link may be out of date, or the lesson you are looking for has not been published yet.
    </p>

    <div class="mt-8 flex flex-wrap gap-3">
      <RouterLink to="/" class="btn-primary">Back home</RouterLink>
      <RouterLink to="/courses" class="btn-ghost">Browse the courses</RouterLink>
    </div>

    <nav class="mt-12 border-t border-line/10 pt-6" aria-label="Pages">
      <ul class="flex list-none flex-wrap items-center gap-x-5 gap-y-2 p-0">
        <li v-for="item in nav" :key="item.to">
          <RouterLink
            :to="item.to"
            class="micro text-fg-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
          >
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
