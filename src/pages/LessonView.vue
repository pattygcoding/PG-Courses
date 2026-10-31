<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { findCourse, type Lesson } from '../content/courses'
import { renderPage } from '../content/markdown'
import { site } from '../site'

const props = defineProps<{
  /** Route parameters from /courses/:course/:lesson. */
  course: string
  lesson: string
}>()

const current = computed(() => findCourse(props.course))
const lessons = computed(() => current.value?.lessons ?? [])
const index = computed(() => lessons.value.findIndex((item) => item.slug === props.lesson))
const lesson = computed<Lesson | undefined>(() => lessons.value[index.value])

/**
 * The lesson body and its headings. markdown-it runs with `html: false`, so raw
 * HTML in a page is escaped rather than injected.
 */
const page = computed(() => (lesson.value ? renderPage(lesson.value.body) : null))

const previous = computed(() => (index.value > 0 ? lessons.value[index.value - 1] : undefined))
const next = computed(() =>
  index.value >= 0 && index.value < lessons.value.length - 1
    ? lessons.value[index.value + 1]
    : undefined,
)

const pageTitle = computed(() =>
  lesson.value && current.value
    ? `${lesson.value.title} - ${current.value.title} - ${site.name}`
    : `Lesson not found - ${site.name}`,
)

onMounted(() => {
  document.title = pageTitle.value
})
watch(pageTitle, (value) => {
  document.title = value
})
</script>

<template>
  <div v-if="current && lesson && page" class="shell py-14 sm:py-20">
    <header class="page-heading">
      <div class="eyebrow">
        <RouterLink
          :to="`/courses/${current.slug}/`"
          class="micro text-accent transition hover:underline"
        >
          {{ current.title }}
        </RouterLink>
        <p class="micro eyebrow-tech text-fg-dim">
          Lesson {{ lesson.order }} of {{ lessons.length }}
          <span class="text-gutter">/</span>
          {{ lesson.minutes }} min read
        </p>
      </div>

      <h1>{{ lesson.title }}</h1>
      <p>{{ lesson.summary }}</p>
      <p class="micro mt-6 text-fg-dim">{{ lesson.chapter }}</p>
    </header>

    <!-- Jump links for a long lesson. The ids are added by renderPage. -->
    <nav v-if="page.headings.length > 1" class="panel mt-8 p-5" aria-labelledby="on-this-page">
      <h2 id="on-this-page" class="micro text-fg-dim">On this page</h2>
      <ul class="mt-3 list-none space-y-1.5 p-0">
        <li
          v-for="heading in page.headings"
          :key="heading.id"
          :class="heading.level === 3 ? 'pl-5' : ''"
        >
          <a
            :href="`#${heading.id}`"
            class="text-sm leading-relaxed text-fg-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
          >
            {{ heading.text }}
          </a>
        </li>
      </ul>
    </nav>

    <article class="prose mt-10 max-w-3xl" v-html="page.html" />

    <nav
      class="mt-14 grid gap-4 border-t border-line/10 pt-8 sm:grid-cols-2"
      aria-label="Lesson navigation"
    >
      <RouterLink
        v-if="previous"
        :to="previous.path"
        class="card p-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
      >
        <span class="micro text-fg-dim">Previous</span>
        <span class="mt-1 block text-sm font-medium text-fg-strong">{{ previous.title }}</span>
      </RouterLink>
      <span v-else aria-hidden="true" />

      <RouterLink
        v-if="next"
        :to="next.path"
        class="card p-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 sm:text-right"
      >
        <span class="micro text-fg-dim">Next</span>
        <span class="mt-1 block text-sm font-medium text-fg-strong">{{ next.title }}</span>
      </RouterLink>
    </nav>

    <RouterLink
      :to="`/courses/${current.slug}/`"
      class="micro mt-8 inline-flex text-fg-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
    >
      Full contents
    </RouterLink>
  </div>

  <!-- Unknown lesson: say so plainly and point back at the contents list. -->
  <div v-else class="shell py-20 sm:py-28">
    <p class="micro text-accent">Lesson not found</p>
    <h1 class="mt-4 text-3xl font-semibold tracking-tight text-fg-strong sm:text-4xl">
      There is no lesson at this address
    </h1>
    <p class="mt-4 max-w-xl text-sm leading-relaxed text-fg-muted">
      The link may be out of date. The course contents list every lesson that exists.
    </p>
    <RouterLink :to="`/courses/${current?.slug ?? props.course}/`" class="btn-primary mt-8">
      Back to the course
    </RouterLink>
  </div>
</template>
