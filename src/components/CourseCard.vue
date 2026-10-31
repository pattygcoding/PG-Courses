<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Course } from '../content/courses'

defineProps<{
  course: Course
}>()
</script>

<template>
  <!--
    The whole card is the link, so the course mark is clickable as well as the
    text.  The mark carries no alt text because the title beside it names it.
  -->
  <RouterLink
    :to="`/courses/${course.slug}/`"
    class="card group flex flex-col gap-4 p-5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
  >
    <span class="flex items-start justify-between gap-3">
      <img
        :src="course.mark"
        alt=""
        width="48"
        height="48"
        class="h-12 w-12 shrink-0 rounded-xl transition duration-200 group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
        loading="lazy"
        decoding="async"
      />
      <span class="micro text-fg-dim">{{ course.level }}</span>
    </span>

    <span class="text-lg font-semibold tracking-tight text-fg-strong">{{ course.title }}</span>

    <span class="text-sm leading-relaxed text-fg-muted">{{ course.summary }}</span>

    <span class="mt-auto flex flex-wrap gap-2 pt-1">
      <span v-for="label in course.labels" :key="label" class="tag text-fg-dim">{{ label }}</span>
    </span>
  </RouterLink>
</template>
