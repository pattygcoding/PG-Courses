<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { site } from '../site'

/** The principles the courses are written to. */
const principles: readonly { title: string; text: string }[] = [
  {
    title: 'Explain the trade-off, not just the syntax',
    text: 'Any feature exists because something else was worse. A lesson that skips that part teaches you to copy code rather than choose it.',
  },
  {
    title: 'Keep the examples real',
    text: 'Every code sample is pulled from a project that runs. Toy examples hide the parts that actually cause trouble.',
  },
  {
    title: 'Write down the mistakes',
    text: 'The bugs and dead ends are part of the work. Where a first attempt was wrong, the lesson says so and shows the fix.',
  },
  {
    title: 'Make it testable',
    text: 'If a claim cannot be checked by running code, it does not belong in a lesson.',
  },
]

const facts: readonly { label: string; value: string }[] = [
  { label: 'Format', value: 'Markdown lessons, versioned in Git' },
  { label: 'Stack', value: 'Vue, TypeScript and Vite' },
  { label: 'Deploys', value: 'GitHub Actions on every push to main' },
  { label: 'Source', value: 'Public on GitHub' },
]
</script>

<template>
  <div class="shell py-14 sm:py-20">
    <header class="page-heading">
      <div class="eyebrow">
        <p class="micro text-accent">About</p>
        <p class="micro eyebrow-tech text-fg-dim">Patrick Goodwin</p>
      </div>
      <h1>About these courses</h1>
      <p>
        I build software for a living, and these courses are the explanation I wish I had when I
        started on each of these topics. They are short on purpose and tied to real projects.
      </p>
    </header>

    <div class="mt-12 max-w-3xl space-y-6 text-sm leading-relaxed text-fg-soft sm:text-base">
      <p>
        Most technical writing is either a reference or a walkthrough. A reference tells you what a
        feature does and leaves the judgement to you. A walkthrough gets something working but
        rarely explains why that path was chosen. These lessons try to sit between the two: enough
        explanation to make a decision, and enough code to prove it.
      </p>
      <p>
        The material comes out of my own projects, which is why the examples lean toward systems
        work, the web platform and the seam between them. Rust compiled to WebAssembly, type systems
        that carry their weight, front ends that ship to a real domain. If I have not built it, I do
        not teach it.
      </p>
    </div>

    <section class="mt-14" aria-labelledby="principles-heading">
      <h2 id="principles-heading" class="text-2xl font-semibold tracking-tight text-fg-strong">
        How the lessons are written
      </h2>
      <ul class="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2">
        <li v-for="principle in principles" :key="principle.title" class="panel p-5">
          <h3 class="text-base font-semibold text-fg-strong">{{ principle.title }}</h3>
          <p class="mt-2 text-sm leading-relaxed text-fg-muted">{{ principle.text }}</p>
        </li>
      </ul>
    </section>

    <section class="mt-14" aria-labelledby="facts-heading">
      <h2 id="facts-heading" class="text-2xl font-semibold tracking-tight text-fg-strong">
        Project details
      </h2>
      <dl class="panel mt-6 divide-y divide-line/10">
        <div
          v-for="fact in facts"
          :key="fact.label"
          class="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:gap-6"
        >
          <dt class="micro w-32 shrink-0 text-fg-dim">{{ fact.label }}</dt>
          <dd class="text-sm text-fg-soft">{{ fact.value }}</dd>
        </div>
      </dl>
    </section>

    <section class="mt-14" aria-labelledby="contact-heading">
      <div class="panel p-6 sm:p-8">
        <h2 id="contact-heading" class="text-xl font-semibold text-fg-strong sm:text-2xl">
          Questions, corrections and requests
        </h2>
        <p class="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
          If a lesson is wrong, unclear, or missing the topic you need, the repository is the place
          to raise it. The portfolio has the rest of my work if you want to see the projects these
          lessons come from.
        </p>
        <div class="mt-6 flex flex-wrap gap-3">
          <a :href="site.repoUrl" target="_blank" rel="noopener noreferrer" class="btn-primary">
            Open the repository
          </a>
          <a :href="site.portfolioUrl" target="_blank" rel="noopener noreferrer" class="btn-ghost">
            Visit pattygcoding.com
          </a>
        </div>
      </div>
    </section>

    <RouterLink
      to="/courses"
      class="micro mt-14 inline-flex text-fg-muted transition hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
    >
      Browse the catalogue
    </RouterLink>
  </div>
</template>
