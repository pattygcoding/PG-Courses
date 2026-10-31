import { describe, expect, it } from 'vitest'
import { courses, findCourse, totalLessonCount } from './courses'

describe('course catalogue', () => {
  it('ships at least one course', () => {
    expect(courses.length).toBeGreaterThan(0)
  })

  it('uses a unique slug for every course', () => {
    const slugs = courses.map((course) => course.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('uses unique lesson slugs within a course', () => {
    for (const course of courses) {
      const slugs = course.lessons.map((lesson) => lesson.slug)
      expect(new Set(slugs).size, `${course.slug} has duplicate lesson slugs`).toBe(slugs.length)
    }
  })

  it('gives every lesson a title, a summary and a positive duration', () => {
    for (const course of courses) {
      for (const lesson of course.lessons) {
        expect(lesson.title.length, `${course.slug}/${lesson.slug} title`).toBeGreaterThan(0)
        expect(lesson.summary.length, `${course.slug}/${lesson.slug} summary`).toBeGreaterThan(0)
        expect(lesson.minutes, `${course.slug}/${lesson.slug} minutes`).toBeGreaterThan(0)
      }
    }
  })

  it('marks every lesson as either a draft or planned', () => {
    for (const course of courses) {
      for (const lesson of course.lessons) {
        expect(['draft', 'planned']).toContain(lesson.status)
      }
    }
  })

  it('finds a course by its slug', () => {
    const first = courses[0]
    expect(first).toBeDefined()
    expect(findCourse(first!.slug)).toBe(first)
  })

  it('returns undefined for an unknown slug', () => {
    expect(findCourse('does-not-exist')).toBeUndefined()
  })

  it('counts every lesson in the catalogue', () => {
    const expected = courses.reduce((total, course) => total + course.lessons.length, 0)
    expect(totalLessonCount()).toBe(expected)
  })
})
