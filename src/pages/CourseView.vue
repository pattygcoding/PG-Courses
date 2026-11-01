<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import MarkdownBody from '../components/MarkdownBody.vue'
import { findCourse } from '../content/courses'
import { renderPage } from '../content/markdown'
import { site } from '../site'

const props = defineProps<{
  /** Route parameter from /courses/:course. */
  course: string
}>()

const current = computed(() => findCourse(props.course))

/**
 * The intro body, rendered from Markdown that lives in this repository.
 * markdown-it runs with `html: false`, so raw HTML in a page is escaped.
 */
const intro = computed(() => (current.value ? renderPage(current.value.body) : null))

const breadcrumb = computed(() => {
  const course = current.value
  if (!course) {
    return ''
  }
  return course.subcategory ? `${course.category} / ${course.subcategory}` : course.category
})

/** Reading time across the lessons, rounded to the nearest half hour. */
const hours = computed(() => Math.round((current.value?.lessonMinutes ?? 0) / 30) / 2)

/** Level plus the lesson count, with the count left out until lessons exist. */
const summaryLine = computed(() => {
  const course = current.value
  if (!course) {
    return ''
  }
  return course.lessons.length > 0
    ? `${course.level} / ${course.lessons.length} lessons`
    : course.level
})

const pageTitle = computed(() =>
  current.value ? `${current.value.title} - ${site.name}` : `Course not found - ${site.name}`,
)

onMounted(() => {
  document.title = pageTitle.value
})
watch(pageTitle, (value) => {
  document.title = value
})

/** Lesson numbers are two digits wide so the contents list stays aligned. */
function pad(order: number): string {
  return String(order).padStart(2, '0')
}
</script>

<template>
  <div v-if="current" class="course-theme shell py-14 sm:py-20" :style="current.theme.vars">
    <header class="page-heading">
      <div class="eyebrow">
        <div class="flex min-w-0 items-center gap-3">
          <img
            :src="current.mark"
            alt=""
            width="36"
            height="36"
            class="h-9 w-9 shrink-0 rounded-lg"
          />
          <p class="micro text-accent">{{ breadcrumb }}</p>
        </div>
        <p class="micro eyebrow-tech text-fg-dim">{{ summaryLine }}</p>
      </div>

      <h1>{{ current.title }}</h1>
      <p>{{ current.summary }}</p>

      <ul class="mt-6 flex list-none flex-wrap gap-2 p-0">
        <li v-for="label in current.labels" :key="label" class="tag text-fg-muted">{{ label }}</li>
      </ul>

      <RouterLink
        to="/"
        class="micro mt-8 inline-flex text-fg-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
      >
        All courses
      </RouterLink>
    </header>

    <MarkdownBody v-if="intro" :html="intro.html" class="mt-10 max-w-3xl" />

    <!-- The contents list. Numbered so a reader can track their place. -->
    <section v-if="current.lessons.length" class="mt-16" aria-labelledby="contents-heading">
      <div class="flex flex-wrap items-end justify-between gap-3 border-b border-line/10 pb-4">
        <h2 id="contents-heading" class="text-2xl font-semibold tracking-tight text-fg-strong">
          Contents
        </h2>
        <p class="micro text-fg-dim">
          {{ current.lessons.length }} lessons
          <span class="text-gutter">/</span>
          about {{ hours }}h
        </p>
      </div>

      <section v-for="chapter in current.chapters" :key="chapter.name" class="mt-8">
        <h3 class="micro mb-2 text-accent">{{ chapter.name }}</h3>

        <ol class="list-none p-0">
          <li v-for="lesson in chapter.lessons" :key="lesson.slug">
            <RouterLink
              :to="lesson.path"
              class="group flex items-baseline gap-4 rounded-md px-3 py-2.5 transition hover:bg-ink-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
            >
              <span class="micro w-6 shrink-0 text-fg-dim">{{ pad(lesson.order) }}</span>
              <span class="flex-1">
                <span
                  class="block text-sm font-medium text-fg-strong transition group-hover:text-accent"
                >
                  {{ lesson.title }}
                </span>
                <span class="mt-1 block text-xs leading-relaxed text-fg-muted">
                  {{ lesson.summary }}
                </span>
              </span>
              <span class="micro shrink-0 text-fg-dim">{{ lesson.minutes }} min</span>
            </RouterLink>
          </li>
        </ol>
      </section>
    </section>
  </div>

  <!-- Unknown slug: say so plainly instead of rendering an empty shell. -->
  <div v-else class="shell py-20 sm:py-28">
    <p class="micro text-accent">Course not found</p>
    <h1 class="mt-4 text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">
      There is no course at this address
    </h1>
    <p class="mt-4 max-w-xl text-sm leading-relaxed text-fg-muted">
      The link may be out of date. The catalogue lists every course that exists.
    </p>
    <RouterLink to="/" class="btn-primary mt-8">Back to the catalogue</RouterLink>
  </div>
</template>
