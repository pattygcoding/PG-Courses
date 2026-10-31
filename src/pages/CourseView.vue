<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { findCourse, type Lesson } from '../content/courses'
import { site } from '../site'

const props = defineProps<{
  /** Route parameter from /courses/:slug. */
  slug: string
}>()

const course = computed(() => findCourse(props.slug))

/** Total reading and practice time, in minutes. */
const totalMinutes = computed(
  () => course.value?.lessons.reduce((total, lesson) => total + lesson.minutes, 0) ?? 0,
)

const pageTitle = computed(() =>
  course.value ? `${course.value.title} - ${site.name}` : `Course not found - ${site.name}`,
)

onMounted(() => {
  document.title = pageTitle.value
})
watch(pageTitle, (value) => {
  document.title = value
})

function statusLabel(lesson: Lesson): string {
  return lesson.status === 'draft' ? 'Draft' : 'Planned'
}
</script>

<template>
  <div v-if="course" class="shell py-14 sm:py-20">
    <header class="page-heading">
      <div class="eyebrow">
        <RouterLink to="/courses" class="micro text-accent transition hover:underline">
          {{ course.track }}
        </RouterLink>
        <p class="micro eyebrow-tech text-fg-dim">
          {{ course.level }}
          <span class="text-gutter">/</span>
          {{ course.lessons.length }} lessons
          <span class="text-gutter">/</span>
          {{ totalMinutes }} min
        </p>
      </div>
      <h1>{{ course.title }}</h1>
      <p>{{ course.description }}</p>
    </header>

    <div class="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <!-- Lesson outline -->
      <section aria-labelledby="outline-heading">
        <h2 id="outline-heading" class="text-xl font-semibold tracking-tight text-fg-strong">
          Lesson outline
        </h2>
        <p class="mt-2 text-sm leading-relaxed text-fg-muted">
          Lessons publish in this order. Drafts are written and being edited; planned lessons are
          outlined and next in the queue.
        </p>

        <ol class="mt-6 list-none space-y-3 p-0">
          <li v-for="(lesson, index) in course.lessons" :key="lesson.slug">
            <article class="panel flex gap-4 p-5">
              <p class="micro pt-1 text-fg-dim">{{ String(index + 1).padStart(2, '0') }}</p>
              <div class="flex-1">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <h3 class="text-base font-semibold text-fg-strong">{{ lesson.title }}</h3>
                  <span class="tag" :class="lesson.status === 'draft' ? 'tag-accent' : ''">
                    {{ statusLabel(lesson) }}
                  </span>
                </div>
                <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ lesson.summary }}</p>
                <p class="micro mt-3 text-fg-dim">{{ lesson.minutes }} min</p>
              </div>
            </article>
          </li>
        </ol>
      </section>

      <!-- Aside -->
      <aside class="space-y-6">
        <div class="panel p-5">
          <h2 class="micro text-fg-dim">What you can do after</h2>
          <ul class="mt-4 list-none space-y-3 p-0">
            <li
              v-for="outcome in course.outcomes"
              :key="outcome"
              class="flex gap-3 text-sm leading-relaxed text-fg-muted"
            >
              <span class="text-accent" aria-hidden="true">&#8594;</span>
              <span>{{ outcome }}</span>
            </li>
          </ul>
        </div>

        <div class="panel p-5">
          <h2 class="micro text-fg-dim">Stack</h2>
          <ul class="mt-4 flex list-none flex-wrap gap-2 p-0">
            <li v-for="item in course.stack" :key="item" class="tag text-fg-muted">{{ item }}</li>
          </ul>
        </div>

        <div class="panel p-5">
          <h2 class="micro text-fg-dim">Status</h2>
          <p class="mt-3 text-sm leading-relaxed text-fg-muted">
            Lessons are written as Markdown and will appear here as each one is finished. In the
            meantime, the outlines above are the plan.
          </p>
        </div>
      </aside>
    </div>
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
    <RouterLink to="/courses" class="btn-primary mt-8">Back to the catalogue</RouterLink>
  </div>
</template>
