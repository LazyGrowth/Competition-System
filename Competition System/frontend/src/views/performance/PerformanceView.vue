<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h1>绩效查看</h1>
    </div>

    <!-- 教师绩效概览 -->
    <div v-if="userStore.isTeacher" class="teacher-performance">
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon icon-score">
            <el-icon :size="28"><TrendCharts /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ performanceData.totalPerformanceScore || 0 }}</div>
            <div class="stat-label">累计绩效分</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-award">
            <el-icon :size="28"><Medal /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ performanceData.totalAwards || 0 }}</div>
            <div class="stat-label">获奖次数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon icon-workload">
            <el-icon :size="28"><Timer /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ totalWorkload }}</div>
            <div class="stat-label">总工作量(学时)</div>
          </div>
        </div>
      </div>

      <!-- 按等级统计 -->
      <el-card shadow="never" style="margin-top: 20px">
        <template #header>
          <span class="card-title">按竞赛等级统计</span>
        </template>
        <el-table :data="levelStats" style="width: 100%">
          <el-table-column prop="level" label="竞赛等级" width="120" sortable>
            <template #default="{ row }">
              <el-tag :type="getLevelType(row.level)">{{ row.level }}级</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="count" label="获奖次数" sortable />
          <el-table-column prop="totalScore" label="绩效分" sortable />
          <el-table-column prop="totalWorkload" label="工作量(学时)" sortable />
        </el-table>
      </el-card>

      <!-- 绩效明细 -->
      <el-card shadow="never" style="margin-top: 20px">
        <template #header>
          <span class="card-title">绩效明细</span>
        </template>
        <el-table :data="performanceData.performanceDetails || []" style="width: 100%" default-sort="{ prop: 'performanceScore', order: 'descending' }">
          <el-table-column prop="competitionName" label="竞赛名称" min-width="200" sortable />
          <el-table-column prop="competitionLevel" label="竞赛等级" width="100" sortable>
            <template #default="{ row }">
              <el-tag :type="getLevelType(row.competitionLevel)">{{ row.competitionLevel }}级</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="awardLevel" label="获奖等级" width="100" sortable>
            <template #default="{ row }">
              {{ getAwardLevelText(row.awardLevel) }}
            </template>
          </el-table-column>
          <el-table-column prop="performanceScore" label="绩效分" width="100" sortable />
          <el-table-column prop="workload" label="工作量" width="100" sortable>
            <template #default="{ row }">
              {{ row.workload }}学时
            </template>
          </el-table-column>
          <el-table-column prop="approvedAt" label="通过时间" width="120" sortable>
            <template #default="{ row }">
              {{ formatDate(row.approvedAt) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- 管理员统计视图 -->
    <div v-else>
      <el-tabs v-model="activeTab">
        <el-tab-pane v-if="userStore.isDepartmentAdmin" label="院级统计" name="department" />
        <el-tab-pane v-if="userStore.isSchoolAdmin" label="校级统计" name="school" />
      </el-tabs>

      <!-- 院级统计 -->
      <div v-if="activeTab === 'department'">
        <!-- 学院选择器（超级管理员和校级管理员需要选择学院） -->
        <div v-if="userStore.isSuperAdmin || userStore.user?.role === 'SCHOOL_ADMIN'" class="filter-bar">
          <el-select 
            v-model="selectedDepartmentId" 
            placeholder="请选择学院" 
            style="width: 240px"
            @change="fetchDepartmentData"
          >
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </div>

        <el-table 
          :data="departmentTeachers" 
          style="width: 100%" 
          :default-sort="{ prop: 'performanceScore', order: 'descending' }"
        >
          <el-table-column type="index" label="排名" width="80" />
          <el-table-column prop="name" label="教师姓名" sortable />
          <el-table-column prop="employeeId" label="工号" sortable />
          <el-table-column prop="performanceScore" label="绩效总分" sortable>
            <template #default="{ row }">
              {{ Number(row.performanceScore).toFixed(1) }}
            </template>
          </el-table-column>
          <el-table-column prop="_count.applications" label="申报数" sortable />
        </el-table>
      </div>

      <!-- 校级统计 -->
      <div v-if="activeTab === 'school'">
        <div class="stat-cards four-cols">
          <div class="stat-card">
            <div class="stat-icon icon-award">
              <el-icon :size="28"><Medal /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ schoolStats.totalStats?.totalAwards || 0 }}</div>
              <div class="stat-label">全校获奖总数</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon icon-score">
              <el-icon :size="28"><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ schoolStats.totalStats?.totalPerformance || 0 }}</div>
              <div class="stat-label">全校绩效总分</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon icon-workload">
              <el-icon :size="28"><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ schoolStats.totalStats?.totalWorkload || 0 }}</div>
              <div class="stat-label">全校工作量(学时)</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon icon-money">
              <el-icon :size="28"><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">¥{{ schoolStats.totalStats?.totalReward || 0 }}</div>
              <div class="stat-label">全校奖励总额</div>
            </div>
          </div>
        </div>

        <el-card shadow="never" style="margin-top: 20px">
          <template #header>
            <span class="card-title">学院绩效排名</span>
          </template>
          <el-table 
            :data="schoolStats.departmentStats || []" 
            style="width: 100%"
            :default-sort="{ prop: 'totalPerformance', order: 'descending' }"
          >
            <el-table-column type="index" label="排名" width="80" />
            <el-table-column prop="name" label="学院名称" sortable />
            <el-table-column prop="teacherCount" label="教师人数" sortable />
            <el-table-column prop="totalPerformance" label="绩效总分" sortable>
              <template #default="{ row }">
                {{ Number(row.totalPerformance).toFixed(1) }}
              </template>
            </el-table-column>
            <el-table-column prop="avgPerformance" label="人均绩效" sortable>
              <template #default="{ row }">
                {{ row.avgPerformance?.toFixed(2) || 0 }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { getMyPerformance, getDepartmentPerformance, getSchoolPerformance } from '@/api/performance';
import { getDepartments } from '@/api/department';
import dayjs from 'dayjs';

const userStore = useUserStore();

const loading = ref(false);
const activeTab = ref(userStore.isDepartmentAdmin ? 'department' : 'school');
const performanceData = ref<any>({});
const departmentTeachers = ref<any[]>([]);
const schoolStats = ref<any>({});
const departments = ref<any[]>([]);
const selectedDepartmentId = ref<number | null>(null);

const levelStats = computed(() => {
  const stats = performanceData.value.statsByLevel || {};
  return Object.entries(stats).map(([level, data]: [string, any]) => ({
    level,
    count: data.count,
    totalScore: data.totalScore,
    totalWorkload: data.totalWorkload,
  }));
});

const totalWorkload = computed(() => {
  return levelStats.value.reduce((sum, item) => sum + (item.totalWorkload || 0), 0);
});

// 获取学院列表
const fetchDepartments = async () => {
  try {
    const res = await getDepartments();
    departments.value = res.data || [];
    // 如果是院级管理员，自动设置其学院
    if (userStore.user?.role === 'DEPARTMENT_ADMIN' && userStore.user.department) {
      selectedDepartmentId.value = userStore.user.department.id;
    }
  } catch (e) {
    console.error(e);
  }
};

// 获取院级绩效数据
const fetchDepartmentData = async () => {
  // 如果是院级管理员，不需要选择学院
  if (userStore.user?.role === 'DEPARTMENT_ADMIN') {
    loading.value = true;
    try {
      const res = await getDepartmentPerformance();
      departmentTeachers.value = res.data || [];
    } catch (e) {
      departmentTeachers.value = [];
    } finally {
      loading.value = false;
    }
    return;
  }
  
  // 超级管理员和校级管理员需要选择学院
  if (!selectedDepartmentId.value) {
    departmentTeachers.value = [];
    return;
  }
  
  loading.value = true;
  try {
    const res = await getDepartmentPerformance({ departmentId: selectedDepartmentId.value });
    departmentTeachers.value = res.data || [];
  } catch (e) {
    departmentTeachers.value = [];
  } finally {
    loading.value = false;
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    if (userStore.isTeacher) {
      const res = await getMyPerformance();
      performanceData.value = res.data;
    } else if (activeTab.value === 'department') {
      await fetchDepartmentData();
    } else {
      const res = await getSchoolPerformance();
      schoolStats.value = res.data;
    }
  } finally {
    loading.value = false;
  }
};

const getLevelType = (level: string): "success" | "info" | "warning" | "danger" | "" => {
  const map: Record<string, "success" | "info" | "warning" | "danger" | ""> = { 
    'A': 'danger', 
    'B': 'warning', 
    'C': 'success', 
    'D': 'info', 
    'E': 'info' 
  };
  return map[level] || 'info';
};

const getAwardLevelText = (level: string) => {
  const map: Record<string, string> = {
    'SPECIAL_PRIZE': '特等奖', 'FIRST_PRIZE': '一等奖', 'SECOND_PRIZE': '二等奖',
    'THIRD_PRIZE': '三等奖', 'EXCELLENCE': '优秀奖',
  };
  return map[level] || level;
};

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD');

watch(activeTab, () => {
  fetchData();
});

onMounted(async () => {
  await fetchDepartments();
  fetchData();
});
</script>

<style lang="scss" scoped>
.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;

  &.four-cols {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);

    &.four-cols {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 576px) {
    grid-template-columns: 1fr;

    &.four-cols {
      grid-template-columns: 1fr;
    }
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 16px;
    background: #fff;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      flex-shrink: 0;

      &.icon-score {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      &.icon-award {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }

      &.icon-workload {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      }

      &.icon-money {
        background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
      }
    }

    .stat-info {
      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: #333;
        line-height: 1.2;
      }

      .stat-label {
        font-size: 14px;
        color: #999;
        margin-top: 4px;
      }
    }
  }
}

.card-title {
  font-weight: 600;
}

.filter-bar {
  margin-bottom: 20px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}
</style>
