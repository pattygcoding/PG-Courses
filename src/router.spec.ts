import { describe, expect, it } from 'vitest'
import { router } from './router'

describe('router', () => {
  it.each([
    ['/', 'home'],
    ['/courses', 'courses'],
    ['/courses/rust-foundations', 'course'],
    ['/about', 'about'],
    ['/some/unknown/path', 'not-found'],
  ])('resolves %s to the %s route', (path, name) => {
    expect(router.resolve(path).name).toBe(name)
  })

  it('passes the slug through to the course page as a prop', () => {
    const resolved = router.resolve('/courses/rust-foundations')
    expect(resolved.params.slug).toBe('rust-foundations')
  })

  it('names every route', () => {
    for (const route of router.getRoutes()) {
      expect(typeof route.name, `route ${route.path} has no name`).toBe('string')
    }
  })
})
