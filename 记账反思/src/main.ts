import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import { authService } from './services/authService'

// 导入页面组件
const HomePage = () => import('./views/HomePage.vue')
const AddPage = () => import('./views/AddPage.vue')
const InboxPage = () => import('./views/InboxPage.vue')
const RulesPage = () => import('./views/RulesPage.vue')
const AnalyticsPage = () => import('./views/AnalyticsPage.vue')
const SettingsPage = () => import('./views/SettingsPage.vue')
const LoginPage = () => import('./views/LoginPage.vue')
const RegisterPage = () => import('./views/RegisterPage.vue')

// 路由配置
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginPage },
    { path: '/register', component: RegisterPage },
    { path: '/', component: HomePage, meta: { requiresAuth: true } },
    { path: '/add', component: AddPage, meta: { requiresAuth: true } },
    { path: '/inbox', component: InboxPage, meta: { requiresAuth: true } },
    { path: '/rules', component: RulesPage, meta: { requiresAuth: true } },
    { path: '/analytics', component: AnalyticsPage, meta: { requiresAuth: true } },
    { path: '/settings', component: SettingsPage, meta: { requiresAuth: true } }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 如果路由需要认证，检查用户是否已登录
  if (to.meta.requiresAuth && !authService.isAuthenticated()) {
    // 未登录，重定向到登录页面
    next('/login')
  } else {
    // 已登录或路由不需要认证，继续导航
    next()
  }
})

// 创建应用实例
const app = createApp(App)
app.use(router)
app.use(createPinia())
app.mount('#app')