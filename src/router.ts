import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { site } from './site'

// Pages set their own title; the fallback keeps every route named even before a
// component has a chance to refine it (a course page adds the course title).
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

const routes: readonly RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('./pages/HomeView.vue'),
    meta: { title: site.name },
  },
  {
    path: '/courses/:course',
    name: 'course',
    component: () => import('./pages/CourseView.vue'),
    props: true,
    meta: { title: `Course - ${site.name}` },
  },
  {
    path: '/courses/:course/:lesson',
    name: 'lesson',
    component: () => import('./pages/LessonView.vue'),
    props: true,
    meta: { title: `Lesson - ${site.name}` },
  },
  {
    // Catch-all last: GitHub Pages serves 404.html (a copy of index.html), the
    // app boots and lands here for any path the router does not recognise.
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('./pages/NotFoundView.vue'),
    meta: { title: `Page not found - ${site.name}` },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    // Restore the previous position on Back, otherwise start at the top.
    return savedPosition ?? { top: 0 }
  },
})

// Keep the document title in step with the route.
router.afterEach((to) => {
  document.title = to.meta.title ?? site.name
})
