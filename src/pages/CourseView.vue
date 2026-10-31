<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { findCourse } from '../content/courses'
import { renderMarkdown } from '../content/markdown'
import { site } from '../site'

const props = defineProps<{
  /** Route parameter from /courses/:slug. */
  slug: string
}>()

const course = computed(() => findCourse(props.slug))

/**
 * The intro page body, rendered from Markdown that lives in this repository.
 * markdown-it runs with `html: false`, so raw HTML in a page is escaped.
 */
const html = computed(() => (course.value ? renderMarkdown(course.value.body) : ''))

const breadcrumb = computed(() => {
  const value = course.value
  if (!value) {
    return ''
  }
  return value.subcategory ? `${value.category} / ${value.subcategory}` : value.category
})

const pageTitle = computed(() =>
  course.value ? `${course.value.title} - ${site.name}` : `Course not found - ${site.name}`,
)

onMounted(() => {
  document.title = pageTitle.value
})
watch(pageTitle, (value) => {
  document.title = value
})
</script>

<template>
  <div v-if="course" class="shell py-14 sm:py-20">
    <header class="page-heading">
      <div class="eyebrow">
        <div class="flex min-w-0 items-center gap-3">
          <img
            :src="course.mark"
            alt=""
            width="36"
            height="36"
            class="h-9 w-9 shrink-0 rounded-lg"
          />
          <p class="micro text-accent">{{ breadcrumb }}</p>
        </div>
        <p class="micro eyebrow-tech text-fg-dim">
          {{ course.level }}
          <span class="text-gutter">/</span>
          {{ course.minutes }} min read
        </p>
      </div>

      <h1>{{ course.title }}</h1>
      <p>{{ course.summary }}</p>

      <ul class="mt-6 flex list-none flex-wrap gap-2 p-0">
        <li v-for="label in course.labels" :key="label" class="tag text-fg-muted">{{ label }}</li>
      </ul>

      <RouterLink
        to="/"
        class="micro mt-8 inline-flex text-fg-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
      >
        All courses
      </RouterLink>
    </header>

    <article class="prose mt-10 max-w-3xl" v-html="html" />
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
