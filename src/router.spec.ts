import { describe, expect, it } from 'vitest'
import { router } from './router'

describe('router', () => {
  it.each([
    ['/', 'home'],
    ['/courses/python', 'course'],
    ['/courses/vue/', 'course'],
    ['/courses/python/iterators-and-generators', 'lesson'],
    ['/courses/python/iterators-and-generators/', 'lesson'],
    ['/some/unknown/path', 'not-found'],
  ])('resolves %s to the %s route', (path, name) => {
    expect(router.resolve(path).name).toBe(name)
  })

  it('passes the course slug through as a prop', () => {
    expect(router.resolve('/courses/python').params).toMatchObject({ course: 'python' })
  })

  it('passes both slugs through to a lesson page', () => {
    const resolved = router.resolve('/courses/python/dictionaries')
    expect(resolved.params).toMatchObject({ course: 'python', lesson: 'dictionaries' })
  })

  it('names every route', () => {
    for (const route of router.getRoutes()) {
      expect(typeof route.name, `route ${route.path} has no name`).toBe('string')
    }
  })
})
