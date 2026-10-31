<script setup lang="ts">
import CourseCard from '../components/CourseCard.vue'
import { catalogue, courses } from '../content/courses'

const categoryCount = catalogue.length
</script>

<template>
  <div class="shell py-14 sm:py-20">
    <header class="page-heading">
      <div class="eyebrow">
        <p class="micro text-accent">Course catalogue</p>
        <p class="micro eyebrow-tech text-fg-dim">
          {{ courses.length }} courses
          <span class="text-gutter">/</span>
          {{ categoryCount }} categories
        </p>
      </div>
      <h1>Courses</h1>
      <p>
        Each course opens with an intro page: what it covers, who it is for, and what you will build
        by the end. Pick a mark to read it.
      </p>
    </header>

    <section
      v-for="category in catalogue"
      :key="category.slug"
      class="mt-14 first:mt-12"
      :aria-labelledby="`category-${category.slug}`"
    >
      <h2
        :id="`category-${category.slug}`"
        class="text-2xl font-semibold tracking-tight text-fg-strong"
      >
        {{ category.name }}
      </h2>

      <div v-for="group in category.groups" :key="group.slug ?? 'all'" class="mt-6">
        <h3 v-if="group.name" class="micro mb-3 text-accent">{{ group.name }}</h3>
        <ul class="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="course in group.courses" :key="course.slug" class="flex">
            <CourseCard :course="course" class="flex-1" />
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
