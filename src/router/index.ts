import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requiresAuth: false, title: 'GreenRoom - Product Pipeline Management' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { title: 'Sign In' },
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('@/views/SignupView.vue'),
    meta: { title: 'Sign Up' },
  },
  {
    path: '/invite/:token',
    name: 'invite-accept',
    component: () => import('@/views/InviteAcceptView.vue'),
    meta: { title: 'Accept Invitation' },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, title: 'Dashboard' },
  },
  {
    path: '/pipeline',
    name: 'pipeline',
    component: () => import('@/views/PipelineView.vue'),
    meta: { requiresAuth: true, title: 'Pipeline' },
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('@/views/CalendarView.vue'),
    meta: { requiresAuth: true, title: 'Calendar' },
  },
  {
    path: '/marketing',
    name: 'marketing',
    component: () => import('@/views/MarketingView.vue'),
    meta: { requiresAuth: true, title: 'Marketing' },
  },
  {
    path: '/photo-queue',
    name: 'photo-queue',
    component: () => import('@/views/PhotoQueueView.vue'),
    meta: { requiresAuth: true, title: 'Photo Queue' },
  },
  {
    path: '/projects',
    name: 'projects',
    component: () => import('@/views/ProjectsView.vue'),
    meta: { requiresAuth: true, title: 'Collections' },
  },
  {
    path: '/projects/:id',
    name: 'collection-detail',
    component: () => import('@/views/CollectionDetailView.vue'),
    meta: { requiresAuth: true, title: 'Collection Detail' },
  },
  {
    path: '/catalogue',
    name: 'catalogue',
    component: () => import('@/views/CatalogueView.vue'),
    meta: { requiresAuth: true, title: 'Catalogue' },
  },
  {
    path: '/reports/launch',
    name: 'launch-report',
    component: () => import('@/views/LaunchReportView.vue'),
    meta: { requiresAuth: true, title: 'Report' },
  },
  {
    path: '/reports/retention',
    name: 'retention-reports',
    component: () => import('@/views/RetentionReportsView.vue'),
    meta: { requiresAuth: true, title: 'Retention Reports' },
  },
  {
    path: '/reports/retention/:reportId',
    name: 'retention-report-detail',
    component: () => import('@/views/RetentionReportDetailView.vue'),
    meta: { requiresAuth: true, title: 'Retention Report' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
    meta: { requiresAuth: true, title: 'Settings' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (authStore.loading) {
    await new Promise<void>((resolve) => {
      const unwatch = authStore.$subscribe(() => {
        if (!authStore.loading) {
          unwatch()
          resolve()
        }
      })
    })
  }

  const requiresAuth = to.meta.requiresAuth === true
  const isAuthenticated = authStore.isAuthenticated

  if (requiresAuth && !isAuthenticated) {
    const redirectPath = to.fullPath !== '/' ? to.fullPath : '/dashboard'
    sessionStorage.setItem('redirectAfterLogin', redirectPath)
    next({ name: 'login', query: { redirect: redirectPath } })
  } else if (to.name === 'home' && isAuthenticated) {
    // Redirect authenticated users from home to dashboard
    next('/dashboard')
  } else if ((to.name === 'login' || to.name === 'signup') && isAuthenticated) {
    // If there's a redirect query param, use it, otherwise use sessionStorage or default to dashboard
    const redirectPath = (to.query.redirect as string) || 
                        sessionStorage.getItem('redirectAfterLogin') || 
                        '/dashboard'
    sessionStorage.removeItem('redirectAfterLogin')
    next(redirectPath)
  } else {
    next()
  }
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  if (title) {
    document.title = `${title} - GreenRoom`
  } else {
    document.title = 'GreenRoom'
  }
})

export default router
