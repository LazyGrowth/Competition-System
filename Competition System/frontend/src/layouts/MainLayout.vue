<template>
  <el-container class="main-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapsed ? '64px' : '240px'" class="sidebar">
      <div class="logo">
        <el-icon :size="28" color="#409eff"><Trophy /></el-icon>
        <span v-show="!isCollapsed" class="logo-text">竞赛管理系统</span>
      </div>
      
      <el-menu
        :default-active="currentRoute"
        :collapse="isCollapsed"
        router
        class="sidebar-menu"
        background-color="#001529"
        text-color="#a6adb4"
        active-text-color="#fff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><Odometer /></el-icon>
          <template #title>工作台</template>
        </el-menu-item>

        <el-sub-menu index="competition">
          <template #title>
            <el-icon><List /></el-icon>
            <span>竞赛管理</span>
          </template>
          <el-menu-item index="/competitions">竞赛列表</el-menu-item>
          <el-menu-item v-if="userStore.isDepartmentAdmin" index="/competitions/import">竞赛导入</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="application">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>申报管理</span>
          </template>
          <el-menu-item index="/applications">申报列表</el-menu-item>
          <el-menu-item v-if="userStore.isTeacher" index="/applications/create">新建申报</el-menu-item>
        </el-sub-menu>

        <el-menu-item v-if="userStore.isDepartmentAdmin" index="/approvals">
          <el-icon><Stamp /></el-icon>
          <template #title>审批管理</template>
        </el-menu-item>

        <el-sub-menu index="award">
          <template #title>
            <el-icon><Medal /></el-icon>
            <span>获奖管理</span>
          </template>
          <el-menu-item index="/awards">获奖记录</el-menu-item>
          <el-menu-item v-if="userStore.isTeacher" index="/awards/submit">提交获奖</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="performance">
          <template #title>
            <el-icon><TrendCharts /></el-icon>
            <span>绩效管理</span>
          </template>
          <el-menu-item index="/performance">绩效查看</el-menu-item>
          <el-menu-item v-if="userStore.isSuperAdmin" index="/performance/rules">绩效规则</el-menu-item>
        </el-sub-menu>

        <el-menu-item v-if="userStore.isSchoolAdmin" index="/rewards">
          <el-icon><Money /></el-icon>
          <template #title>年度奖励</template>
        </el-menu-item>

        <el-menu-item v-if="userStore.isDepartmentAdmin" index="/statistics">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>数据统计</template>
        </el-menu-item>

        <el-menu-item index="/students">
          <el-icon><User /></el-icon>
          <template #title>学生管理</template>
        </el-menu-item>

        <el-menu-item v-if="userStore.isDepartmentAdmin" index="/users">
          <el-icon><UserFilled /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>

        <el-menu-item v-if="userStore.isSuperAdmin" index="/departments">
          <el-icon><OfficeBuilding /></el-icon>
          <template #title>学院管理</template>
        </el-menu-item>

        <el-menu-item index="/system/history-import">
          <el-icon><Upload /></el-icon>
          <template #title>历史数据导入</template>
        </el-menu-item>

        <el-sub-menu v-if="userStore.isSuperAdmin" index="system">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统管理</span>
          </template>
          <el-menu-item index="/system/configs">系统配置</el-menu-item>
          <el-menu-item index="/system/logs">操作日志</el-menu-item>
          <el-menu-item index="/system/backup">数据备份</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container class="main-container">
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon 
            class="collapse-btn" 
            :size="20" 
            @click="isCollapsed = !isCollapsed"
          >
            <component :is="isCollapsed ? 'Expand' : 'Fold'" />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="$route.meta.title">{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <el-dropdown trigger="click">
            <div class="user-info">
              <el-avatar :size="32" class="avatar">
                {{ userStore.user?.name?.charAt(0) || 'U' }}
              </el-avatar>
              <span class="user-name">{{ userStore.user?.name }}</span>
              <span class="user-role">{{ userStore.roleText }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/profile')">
                  <el-icon><User /></el-icon>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const isCollapsed = ref(false);

const currentRoute = computed(() => route.path);

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await userStore.logout();
    router.push('/login');
  } catch {
    // 取消退出
  }
};
</script>

<style lang="scss" scoped>
.main-layout {
  height: 100vh;
}

.sidebar {
  background: #001529;
  transition: width 0.3s;
  overflow-x: hidden;

  .logo {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(255, 255, 255, 0.05);

    .logo-text {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
    }
  }

  .sidebar-menu {
    border-right: none;

    :deep(.el-menu-item.is-active) {
      background: #409eff !important;
    }
  }
}

.main-container {
  background: #f0f2f5;
}

.header {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .collapse-btn {
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: background 0.2s;

      &:hover {
        background: #f0f0f0;
      }
    }
  }

  .header-right {
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;

      &:hover {
        background: #f0f0f0;
      }

      .avatar {
        background: #409eff;
        color: #fff;
      }

      .user-name {
        font-weight: 500;
        color: #333;
      }

      .user-role {
        font-size: 12px;
        color: #999;
        padding: 2px 8px;
        background: #f0f0f0;
        border-radius: 10px;
      }
    }
  }
}

.main-content {
  padding: 20px;
  overflow-y: auto;
}
</style>
