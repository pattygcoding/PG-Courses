import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App.vue'
import { courses } from './content/courses'
import { router } from './router'
import { site } from './site'

async function mountApp() {
  const wrapper = mount(App, { global: { plugins: [router] } })
  await router.isReady()
  return wrapper
}

describe('App shell', () => {
  beforeEach(async () => {
    await router.replace('/')
  })

  it('renders the brand in the header', async () => {
    const wrapper = await mountApp()
    expect(wrapper.get('header').text()).toContain(site.brand)
  })

  it('renders the footer note', async () => {
    const wrapper = await mountApp()
    expect(wrapper.get('footer').text()).toContain('Built with Vue and TypeScript')
  })

  it('links to the repository from the header and the footer', async () => {
    const wrapper = await mountApp()
    expect(wrapper.findAll(`a[href="${site.repoUrl}"]`).length).toBe(2)
  })

  it('exposes a main landmark for page content', async () => {
    const wrapper = await mountApp()
    expect(wrapper.find('main#main').exists()).toBe(true)
  })

  it('renders the catalogue on the home route, grouped by category', async () => {
    const wrapper = await mountApp()
    const text = wrapper.get('main').text()
    expect(text).toContain('Frameworks')
    expect(text).toContain('Languages')
    expect(text).toContain('Frontend')
    expect(text).toContain('Backend')
  })

  it('links every course card to its own page', async () => {
    const wrapper = await mountApp()
    for (const course of courses) {
      expect(wrapper.find(`a[href="/courses/${course.slug}/"]`).exists()).toBe(true)
    }
  })

  it('shows the course mark on each card', async () => {
    const wrapper = await mountApp()
    for (const course of courses) {
      expect(wrapper.find(`img[src="${course.mark}"]`).exists()).toBe(true)
    }
  })
})
