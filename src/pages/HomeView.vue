<script setup lang="ts">
import { RouterLink } from 'vue-router'
import CourseCard from '../components/CourseCard.vue'
import { courses, totalLessonCount } from '../content/courses'
import { site } from '../site'

const lessonCount = totalLessonCount()

/** How a course is meant to be worked through. */
const steps: readonly { label: string; title: string; text: string }[] = [
  {
    label: 'Read',
    title: 'A short explanation',
    text: 'Every lesson opens with the idea in plain language, the problem it solves and the trade-off it makes.',
  },
  {
    label: 'Build',
    title: 'Working code',
    text: 'Each lesson ends in code that runs, so the concept is proved rather than described.',
  },
  {
    label: 'Check',
    title: 'Honest tests',
    text: 'The same tests that guard my own projects are included, so you can see what breaks and why.',
  },
]
</script>

<template>
  <div class="shell py-14 sm:py-20">
    <!-- Hero -->
    <header>
      <p class="micro text-accent">Courses and lesson notes</p>
      <h1
        class="mt-4 text-4xl font-semibold leading-tight tracking-tight text-fg-strong sm:text-6xl"
      >
        Learn to build software the way
        <span class="text-accent">it ships</span>
      </h1>
      <p class="mt-5 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-base">
        Short, project-driven courses on Rust, TypeScript, WebAssembly and the web. No filler, no
        toy examples that never leave the tutorial. Each lesson is a real piece of a real project.
      </p>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        <RouterLink to="/courses" class="btn-primary">
          Browse the courses
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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
        </RouterLink>
        <a :href="site.repoUrl" target="_blank" rel="noopener noreferrer" class="btn-ghost">
          Read the repository
        </a>
      </div>
    </header>

    <!-- Headline figures -->
    <dl class="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div class="panel p-5">
        <dt class="micro text-fg-dim">Courses</dt>
        <dd class="mt-2 text-2xl font-semibold text-fg-strong">{{ courses.length }}</dd>
      </div>
      <div class="panel p-5">
        <dt class="micro text-fg-dim">Lessons</dt>
        <dd class="mt-2 text-2xl font-semibold text-fg-strong">{{ lessonCount }}</dd>
      </div>
      <div class="panel p-5">
        <dt class="micro text-fg-dim">Tracks</dt>
        <dd class="mt-2 text-2xl font-semibold text-fg-strong">3</dd>
      </div>
      <div class="panel p-5">
        <dt class="micro text-fg-dim">Format</dt>
        <dd class="mt-2 text-2xl font-semibold text-fg-strong">Markdown</dd>
      </div>
    </dl>

    <!-- Course grid -->
    <section class="mt-16" aria-labelledby="courses-heading">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <h2 id="courses-heading" class="text-2xl font-semibold tracking-tight text-fg-strong">
          The catalogue
        </h2>
        <RouterLink
          to="/courses"
          class="micro text-fg-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
        >
          All courses
        </RouterLink>
      </div>

      <ul class="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="course in courses" :key="course.slug" class="flex">
          <CourseCard :course="course" class="flex-1" />
        </li>
      </ul>
    </section>

    <!-- How a course works -->
    <section class="mt-16" aria-labelledby="steps-heading">
      <h2 id="steps-heading" class="text-2xl font-semibold tracking-tight text-fg-strong">
        How a course works
      </h2>
      <ul class="mt-6 grid list-none gap-4 p-0 sm:grid-cols-3">
        <li v-for="step in steps" :key="step.label" class="panel p-5">
          <p class="micro text-accent">{{ step.label }}</p>
          <p class="mt-3 text-base font-semibold text-fg-strong">{{ step.title }}</p>
          <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ step.text }}</p>
        </li>
      </ul>
    </section>

    <!-- Roadmap -->
    <section class="mt-16" aria-labelledby="roadmap-heading">
      <div class="panel p-6 sm:p-8">
        <p class="micro text-fg-dim">Roadmap</p>
        <h2 id="roadmap-heading" class="mt-3 text-xl font-semibold text-fg-strong sm:text-2xl">
          The lesson notes are landing next
        </h2>
        <p class="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
          The catalogue and outlines above are the plan. Lessons are being written as Markdown files
          and will publish here as they are finished, in the order they appear on each course page.
        </p>
        <RouterLink to="/about" class="btn-ghost mt-6">More about the project</RouterLink>
      </div>
    </section>
  </div>
</template>
