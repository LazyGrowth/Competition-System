import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { login as loginApi, logout as logoutApi, getProfile } from '@/api/auth';

export interface User {
  id: number;
  employeeId: string;
  name: string;
  gender?: string;
  role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'DEPARTMENT_ADMIN' | 'TEACHER';
  department?: {
    id: number;
    name: string;
    code: string;
  };
  performanceScore?: number;
  monthlyEditInfo?: {
    count: number;
    freeLimit: number;
    remaining: number;
  };
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(null);
  const user = ref<User | null>(null);

  const isLoggedIn = computed(() => !!token.value);
  
  const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN');
  const isSchoolAdmin = computed(() => 
    user.value?.role === 'SUPER_ADMIN' || user.value?.role === 'SCHOOL_ADMIN'
  );
  const isDepartmentAdmin = computed(() => 
    ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'DEPARTMENT_ADMIN'].includes(user.value?.role || '')
  );
  const isTeacher = computed(() => user.value?.role === 'TEACHER');

  const roleText = computed(() => {
    const roleMap: Record<string, string> = {
      'SUPER_ADMIN': '超级管理员',
      'SCHOOL_ADMIN': '校级管理员',
      'DEPARTMENT_ADMIN': '院级管理员',
      'TEACHER': '教师',
    };
    return roleMap[user.value?.role || ''] || '未知';
  });

  async function login(employeeId: string, password: string) {
    const res = await loginApi({ employeeId, password });
    token.value = res.data.token;
    user.value = res.data.user;
    return res;
  }

  async function logout() {
    try {
      await logoutApi();
    } catch (_e) {
      // 忽略登出错误
    }
    token.value = null;
    user.value = null;
  }

  // 仅清除本地认证状态（不调用API，用于处理401时避免无限循环）
  function clearAuth() {
    token.value = null;
    user.value = null;
  }

  async function fetchProfile() {
    const res = await getProfile();
    user.value = res.data;
  }

  function hasRole(...roles: string[]) {
    return roles.includes(user.value?.role || '');
  }

  return {
    token,
    user,
    isLoggedIn,
    isSuperAdmin,
    isSchoolAdmin,
    isDepartmentAdmin,
    isTeacher,
    roleText,
    login,
    logout,
    clearAuth,
    fetchProfile,
    hasRole,
  };
}, {
  persist: {
    key: 'competition-user',
    paths: ['token', 'user'],
  },
});
