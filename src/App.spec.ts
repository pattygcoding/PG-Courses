import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import App from './App.vue'
import { site } from './site'

describe('App shell', () => {
  it('renders the brand in the header', () => {
    const wrapper = mount(App)
    expect(wrapper.get('header').text()).toContain(site.brand)
  })

  it('links to the repository from the header and the footer', () => {
    const wrapper = mount(App)
    const repoLinks = wrapper.findAll(`a[href="${site.repoUrl}"]`)
    expect(repoLinks.length).toBe(2)
  })

  it('renders the footer note', () => {
    const wrapper = mount(App)
    expect(wrapper.get('footer').text()).toContain('Built with Vue and TypeScript')
  })

  it('exposes a main landmark for page content', () => {
    const wrapper = mount(App)
    expect(wrapper.find('main#main').exists()).toBe(true)
  })
})
