<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { Course } from '../content/courses'

const props = defineProps<{
  course: Course
}>()

const lessonCount = computed(() => props.course.lessons.length)

/** Reading time across the lessons, rounded to the nearest half hour. */
const hours = computed(() => Math.round(props.course.lessonMinutes / 30) / 2)

/** Say how many lessons, or that they are on the way, rather than showing a zero. */
const lessons = computed(() => {
  if (lessonCount.value === 0) {
    return 'Lessons coming'
  }
  return lessonCount.value === 1 ? '1 lesson' : `${lessonCount.value} lessons`
})
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

    <span class="flex items-center justify-between gap-3 border-t border-line/10 pt-3">
      <span class="micro text-fg-dim">{{ lessons }}</span>
      <span v-if="lessonCount > 0" class="micro text-fg-dim">about {{ hours }}h</span>
    </span>
  </RouterLink>
</template>
