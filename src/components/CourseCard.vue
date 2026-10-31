<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Course } from '../content/courses'

const props = defineProps<{
  course: Course
}>()

const lessonCount = computed(() => props.course.lessons.length)

/** Total reading and practice time, rounded to the nearest half hour. */
const hours = computed(() => {
  const minutes = props.course.lessons.reduce((total, lesson) => total + lesson.minutes, 0)
  return Math.round((minutes / 60) * 2) / 2
})
</script>

<template>
  <RouterLink
    :to="`/courses/${course.slug}`"
    class="card group flex flex-col gap-3 p-5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
  >
    <span class="flex items-center justify-between gap-3">
      <span class="micro text-accent">{{ course.track }}</span>
      <span class="micro text-fg-dim">{{ hours }}h</span>
    </span>

    <span class="text-xl font-semibold tracking-tight text-fg-strong">{{ course.title }}</span>

    <span class="text-sm leading-relaxed text-fg-muted">{{ course.summary }}</span>

    <span class="mt-auto flex items-center justify-between gap-3 pt-2">
      <span class="micro text-fg-dim">{{ lessonCount }} lessons</span>
      <span
        class="micro flex items-center gap-1.5 text-fg-muted transition group-hover:text-accent"
      >
        Open
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </span>
    </span>
  </RouterLink>
</template>
