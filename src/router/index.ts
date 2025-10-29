import { createRouter, createWebHistory } from 'vue-router'

const Login = () => import('../views/Login.vue')
const TeacherDashboard = () => import('../views/TeacherDashboard.vue')
const StudentDashboard = () => import('../views/StudentDashboard.vue')
const QRScan = () => import('../views/QRScan.vue')
const SignupStudent = () => import('../views/SignupStudent.vue')
const SignupTeacher = () => import('../views/SignupTeacher.vue')

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login },
  { path: '/signup-student', name: 'SignupStudent', component: SignupStudent },
  { path: '/signup-teacher', name: 'SignupTeacher', component: SignupTeacher },
  { path: '/scan', name: 'QRScan', component: QRScan },
  {
    path: '/teacher-dashboard',
    name: 'TeacherDashboard',
    component: TeacherDashboard,
    meta: { requiresAuth: true, userType: 'teacher' },
  },
  {
    path: '/student-dashboard',
    name: 'StudentDashboard',
    component: StudentDashboard,
    meta: { requiresAuth: true, userType: 'student' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// ✅ Navigation guard
router.beforeEach((to, _from, next) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')

  if (to.meta.requiresAuth && !user) {
    next('/login')
  } else if (to.meta.userType && user && user.type !== to.meta.userType) {
    const redirectPath =
      user.type === 'teacher' ? '/teacher-dashboard' : '/student-dashboard'
    next(redirectPath)
  } else {
    next()
  }
})

export default router
