<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { courses, totalLessonCount, type Course } from '../content/courses'

const lessonCount = totalLessonCount()

/** Group the catalogue by track so the page reads as a curriculum, not a dump. */
const tracks = computed(() => {
  const order: string[] = []
  const byTrack = new Map<string, Course[]>()
  for (const course of courses) {
    if (!byTrack.has(course.track)) {
      byTrack.set(course.track, [])
      order.push(course.track)
    }
    byTrack.get(course.track)?.push(course)
  }
  return order.map((track) => ({ track, courses: byTrack.get(track) ?? [] }))
})
</script>

<template>
  <div class="shell py-14 sm:py-20">
    <header class="page-heading">
      <div class="eyebrow">
        <p class="micro text-accent">Catalogue</p>
        <p class="micro eyebrow-tech text-fg-dim">
          {{ courses.length }} courses
          <span class="text-gutter">/</span>
          {{ lessonCount }} lessons
        </p>
      </div>
      <h1>Courses</h1>
      <p>
        Grouped by track. Every course is written from a project I have actually built and shipped,
        so the examples come with the trade-offs they were chosen for.
      </p>
    </header>

    <section
      v-for="group in tracks"
      :key="group.track"
      class="mt-12 first:mt-10"
      :aria-labelledby="`track-${group.track}`"
    >
      <h2 :id="`track-${group.track}`" class="micro text-fg-dim">{{ group.track }}</h2>

      <ul class="mt-4 grid list-none gap-4 p-0">
        <li v-for="course in group.courses" :key="course.slug">
          <RouterLink
            :to="`/courses/${course.slug}`"
            class="card group flex flex-col gap-4 p-6 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="text-xl font-semibold tracking-tight text-fg-strong">
                  {{ course.title }}
                </h3>
                <p class="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">
                  {{ course.summary }}
                </p>
              </div>
              <span class="tag">{{ course.level }}</span>
            </div>

            <ul class="flex list-none flex-wrap gap-2 p-0">
              <li v-for="item in course.stack" :key="item" class="tag text-fg-dim">{{ item }}</li>
            </ul>

            <div class="flex items-center justify-between gap-3">
              <p class="micro text-fg-dim">{{ course.lessons.length }} lessons</p>
              <p
                class="micro flex items-center gap-1.5 text-fg-muted transition group-hover:text-accent"
              >
                Open course
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
              </p>
            </div>
          </RouterLink>
        </li>
      </ul>
    </section>
  </div>
</template>
