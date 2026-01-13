import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores/user';

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '工作台' },
      },
      // 竞赛管理
      {
        path: 'competitions',
        name: 'Competitions',
        component: () => import('@/views/competition/CompetitionList.vue'),
        meta: { title: '竞赛列表' },
      },
      {
        path: 'competitions/import',
        name: 'CompetitionImport',
        component: () => import('@/views/competition/CompetitionImport.vue'),
        meta: { title: '竞赛导入', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DEPARTMENT_ADMIN'] },
      },
      // 申报管理
      {
        path: 'applications',
        name: 'Applications',
        component: () => import('@/views/application/ApplicationList.vue'),
        meta: { title: '申报列表' },
      },
      {
        path: 'applications/create',
        name: 'ApplicationCreate',
        component: () => import('@/views/application/ApplicationForm.vue'),
        meta: { title: '新建申报', roles: ['TEACHER'] },
      },
      {
        path: 'applications/:id',
        name: 'ApplicationDetail',
        component: () => import('@/views/application/ApplicationDetail.vue'),
        meta: { title: '申报详情' },
      },
      // 审批管理
      {
        path: 'approvals',
        name: 'Approvals',
        component: () => import('@/views/approval/ApprovalList.vue'),
        meta: { title: '审批列表', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DEPARTMENT_ADMIN'] },
      },
      // 获奖管理
      {
        path: 'awards',
        name: 'Awards',
        component: () => import('@/views/award/AwardList.vue'),
        meta: { title: '获奖记录' },
      },
      {
        path: 'awards/submit',
        name: 'AwardSubmit',
        component: () => import('@/views/award/AwardSubmit.vue'),
        meta: { title: '提交获奖', roles: ['TEACHER'] },
      },
      // 绩效管理
      {
        path: 'performance',
        name: 'Performance',
        component: () => import('@/views/performance/PerformanceView.vue'),
        meta: { title: '绩效查看' },
      },
      {
        path: 'performance/rules',
        name: 'PerformanceRules',
        component: () => import('@/views/performance/PerformanceRules.vue'),
        meta: { title: '绩效规则', roles: ['SUPER_ADMIN'] },
      },
      // 奖励管理
      {
        path: 'rewards',
        name: 'Rewards',
        component: () => import('@/views/reward/RewardList.vue'),
        meta: { title: '年度奖励', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] },
      },
      // 数据统计
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/statistics/StatisticsView.vue'),
        meta: { title: '数据统计', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DEPARTMENT_ADMIN'] },
      },
      // 学生管理
      {
        path: 'students',
        name: 'Students',
        component: () => import('@/views/student/StudentList.vue'),
        meta: { title: '学生管理' },
      },
      // 用户管理
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/user/UserList.vue'),
        meta: { title: '用户管理', roles: ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DEPARTMENT_ADMIN'] },
      },
      // 个人中心
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/user/Profile.vue'),
        meta: { title: '个人中心' },
      },
      // 学院管理
      {
        path: 'departments',
        name: 'Departments',
        component: () => import('@/views/department/DepartmentList.vue'),
        meta: { title: '学院管理', roles: ['SUPER_ADMIN'] },
      },
      // 系统管理
      {
        path: 'system/configs',
        name: 'SystemConfigs',
        component: () => import('@/views/system/SystemConfigs.vue'),
        meta: { title: '系统配置', roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'system/logs',
        name: 'SystemLogs',
        component: () => import('@/views/system/SystemLogs.vue'),
        meta: { title: '操作日志', roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'system/backup',
        name: 'SystemBackup',
        component: () => import('@/views/system/SystemBackup.vue'),
        meta: { title: '数据备份', roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'system/history-import',
        name: 'HistoryImport',
        component: () => import('@/views/system/HistoryImport.vue'),
        meta: { title: '历史数据导入' },
      },
    ],
  },
  // 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore();
  
  // 设置页面标题
  document.title = `${to.meta.title || '竞赛管理系统'} - 竞赛管理系统`;

  // 不需要认证的页面
  if (to.meta.requiresAuth === false) {
    if (userStore.isLoggedIn && to.name === 'Login') {
      next('/dashboard');
    } else {
      next();
    }
    return;
  }

  // 需要认证
  if (!userStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } });
    return;
  }

  // 角色权限检查
  const requiredRoles = to.meta.roles as string[] | undefined;
  if (requiredRoles && requiredRoles.length > 0) {
    if (!requiredRoles.includes(userStore.user?.role || '')) {
      next('/dashboard');
      return;
    }
  }

  next();
});

export default router;
