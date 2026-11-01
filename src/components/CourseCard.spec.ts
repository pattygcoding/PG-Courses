import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { Course, Lesson } from '../content/courses'
import { themeFor } from '../content/theme'
import { router } from '../router'
import CourseCard from './CourseCard.vue'

/** A lesson with the fields the card does not look at filled in. */
function lesson(order: number, minutes: number): Lesson {
  return {
    slug: `lesson-${order}`,
    title: `Lesson ${order}`,
    summary: 'A lesson.',
    chapter: 'Basics',
    minutes,
    status: 'draft',
    order,
    path: `/courses/sample/lesson-${order}/`,
    body: 'Body text that is long enough to stand in for a real lesson body here.',
  }
}

function course(overrides: Partial<Course> = {}): Course {
  return {
    slug: 'sample',
    title: 'Sample',
    category: 'Languages',
    categorySlug: 'languages',
    subcategory: null,
    subcategorySlug: null,
    level: 'Beginner',
    summary: 'A sample course.',
    labels: ['Language'],
    minutes: 10,
    status: 'draft',
    mark: '/marks/sample.svg',
    // The card never reads the theme, so any real course's values will do.
    theme: themeFor('python'),
    body: 'Body',
    lessons: [],
    chapters: [],
    lessonMinutes: 0,
    ...overrides,
  }
}

function mountCard(overrides: Partial<Course> = {}) {
  return mount(CourseCard, {
    props: { course: course(overrides) },
    global: { plugins: [router] },
  })
}

describe('CourseCard', () => {
  it('links to the course page with a trailing slash', () => {
    expect(mountCard().get('a').attributes('href')).toBe('/courses/sample/')
  })

  it('shows the mark, title, summary and labels', () => {
    const wrapper = mountCard()
    expect(wrapper.get('img').attributes('src')).toBe('/marks/sample.svg')
    expect(wrapper.text()).toContain('Sample')
    expect(wrapper.text()).toContain('A sample course.')
    expect(wrapper.text()).toContain('Language')
  })

  it('says the lessons are coming when there are none yet', () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('Lessons coming')
    expect(wrapper.text()).not.toContain('0 lessons')
    expect(wrapper.text()).not.toContain('about')
  })

  it('counts one lesson in the singular', () => {
    const wrapper = mountCard({ lessons: [lesson(1, 50)], lessonMinutes: 50 })
    expect(wrapper.text()).toContain('1 lesson')
    expect(wrapper.text()).not.toContain('1 lessons')
  })

  it('counts several lessons and rounds the reading time to the nearest half hour', () => {
    const wrapper = mountCard({
      lessons: [lesson(1, 45), lesson(2, 45)],
      lessonMinutes: 90,
    })
    expect(wrapper.text()).toContain('2 lessons')
    expect(wrapper.text()).toContain('about 1.5h')
  })
})
