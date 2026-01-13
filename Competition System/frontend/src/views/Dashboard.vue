<template>
  <div class="dashboard">
    <!-- 获奖滚动展示 -->
    <div class="award-marquee" v-if="latestAwards.length > 0">
      <div class="marquee-content">
        <div class="award-item" v-for="(award, index) in [...latestAwards, ...latestAwards]" :key="index">
          <el-icon class="award-icon"><Medal /></el-icon>
          <span>{{ award.application?.teacher?.name }} 指导获得 {{ award.application?.competition?.name }} {{ getAwardLevelText(award.awardLevel) }}</span>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
          <el-icon :size="28"><List /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.totalCompetitions }}</div>
          <div class="stat-label">竞赛总数</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
          <el-icon :size="28"><Document /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.totalApplications }}</div>
          <div class="stat-label">申报总数</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">
          <el-icon :size="28"><Medal /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.totalAwards }}</div>
          <div class="stat-label">获奖总数</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">
          <el-icon :size="28"><TrendCharts /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.totalPerformance }}</div>
          <div class="stat-label">绩效总分</div>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <h3>快捷操作</h3>
      <div class="action-grid">
        <div class="action-item" @click="router.push('/competitions')">
          <el-icon :size="32" color="#409eff"><List /></el-icon>
          <span>浏览竞赛</span>
        </div>
        <div class="action-item" v-if="userStore.isTeacher" @click="router.push('/applications/create')">
          <el-icon :size="32" color="#67c23a"><Plus /></el-icon>
          <span>新建申报</span>
        </div>
        <div class="action-item" v-if="userStore.isDepartmentAdmin" @click="router.push('/approvals')">
          <el-icon :size="32" color="#e6a23c"><Stamp /></el-icon>
          <span>审批管理</span>
        </div>
        <div class="action-item" @click="router.push('/awards')">
          <el-icon :size="32" color="#f56c6c"><Medal /></el-icon>
          <span>获奖记录</span>
        </div>
        <div class="action-item" @click="router.push('/performance')">
          <el-icon :size="32" color="#909399"><TrendCharts /></el-icon>
          <span>绩效查看</span>
        </div>
        <div class="action-item" @click="router.push('/profile')">
          <el-icon :size="32" color="#409eff"><User /></el-icon>
          <span>个人中心</span>
        </div>
      </div>
    </div>

    <!-- 我的申报 / 待审批 -->
    <div class="dashboard-content">
      <div class="content-section">
        <div class="section-header">
          <h3>{{ userStore.isTeacher ? '我的申报' : '待审批' }}</h3>
          <el-button text type="primary" @click="router.push(userStore.isTeacher ? '/applications' : '/approvals')">
            查看更多 <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
        <el-table :data="myApplications" style="width: 100%" empty-text="暂无数据">
          <el-table-column prop="competition.name" label="竞赛名称" min-width="200" />
          <el-table-column prop="competition.level" label="等级" width="80">
            <template #default="{ row }">
              <el-tag :type="getLevelType(row.competition?.level)">{{ row.competition?.level }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="submittedAt" label="提交时间" width="180">
            <template #default="{ row }">
              {{ row.submittedAt ? formatDate(row.submittedAt) : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button text type="primary" @click="router.push(`/applications/${row.id}`)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="content-section" v-if="userStore.isDepartmentAdmin">
        <div class="section-header">
          <h3>竞赛等级分布</h3>
        </div>
        <div ref="chartRef" class="chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import { useUserStore } from '@/stores/user';
import { getOverviewStats, getCompetitionStats } from '@/api/statistics';
import { getLatestAwards } from '@/api/award';
import { getMyApplications } from '@/api/application';
import { getPendingApprovals } from '@/api/approval';
import dayjs from 'dayjs';

const router = useRouter();
const userStore = useUserStore();

const stats = ref({
  totalCompetitions: 0,
  totalApplications: 0,
  totalAwards: 0,
  totalPerformance: 0,
});

const latestAwards = ref<any[]>([]);
const myApplications = ref<any[]>([]);
const chartRef = ref<HTMLElement>();
let chart: echarts.ECharts | null = null;

const fetchData = async () => {
  try {
    // 获取统计数据
    const statsRes = await getOverviewStats();
    stats.value = statsRes.data;

    // 获取最新获奖
    const awardsRes = await getLatestAwards();
    latestAwards.value = awardsRes.data || [];

    // 获取申报/待审批列表
    if (userStore.isTeacher) {
      const appRes = await getMyApplications({ page: 1, pageSize: 5 });
      myApplications.value = appRes.data || [];
    } else if (userStore.isDepartmentAdmin) {
      const appRes = await getPendingApprovals({ page: 1, pageSize: 5 });
      myApplications.value = appRes.data || [];
    }

    // 获取竞赛统计（用于图表）
    if (userStore.isDepartmentAdmin) {
      const competitionStats = await getCompetitionStats();
      initChart(competitionStats.data.competitionsByLevel);
    }
  } catch (error) {
    console.error('获取数据失败', error);
  }
};

const initChart = (data: any[]) => {
  if (!chartRef.value) return;

  chart = echarts.init(chartRef.value);
  const option = {
    tooltip: {
      trigger: 'item',
    },
    legend: {
      bottom: '5%',
      left: 'center',
    },
    series: [
      {
        name: '竞赛等级',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
          position: 'center',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: false,
        },
        data: data.map((item: any) => ({
          value: item._count,
          name: `${item.level}级竞赛`,
        })),
      },
    ],
  };
  chart.setOption(option);
};

const getAwardLevelText = (level: string) => {
  const map: Record<string, string> = {
    'SPECIAL_PRIZE': '特等奖',
    'FIRST_PRIZE': '一等奖',
    'SECOND_PRIZE': '二等奖',
    'THIRD_PRIZE': '三等奖',
    'EXCELLENCE': '优秀奖',
  };
  return map[level] || level;
};

const getLevelType = (level?: string): "success" | "info" | "warning" | "danger" | "" => {
  if (!level) return 'info';
  const map: Record<string, string> = {
    'A': 'danger',
    'B': 'warning',
    'C': 'success',
    'D': 'info',
    'E': 'info',
  };
  return map[level] || 'info';
};

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    'DRAFT': 'info',
    'PENDING_DEPARTMENT': 'warning',
    'PENDING_SCHOOL': 'warning',
    'APPROVED': 'success',
    'REJECTED': 'danger',
    'REVISION_REQUIRED': 'warning',
  };
  return map[status] || '';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'DRAFT': '草稿',
    'PENDING_DEPARTMENT': '待院级审核',
    'PENDING_SCHOOL': '待校级审核',
    'APPROVED': '已通过',
    'REJECTED': '已驳回',
    'REVISION_REQUIRED': '需修改',
  };
  return map[status] || status;
};

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
};

onMounted(() => {
  fetchData();
  window.addEventListener('resize', () => chart?.resize());
});

onUnmounted(() => {
  chart?.dispose();
  window.removeEventListener('resize', () => chart?.resize());
});
</script>

<style lang="scss" scoped>
.dashboard {
  .award-marquee {
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    padding: 12px 24px;
    border-radius: 8px;
    margin-bottom: 24px;
    overflow: hidden;
    white-space: nowrap;

    .marquee-content {
      display: inline-flex;
      animation: marquee 30s linear infinite;
      
      &:hover {
        animation-play-state: paused;
      }
    }

    .award-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #fff;
      padding: 0 40px;
      font-size: 14px;

      .award-icon {
        color: #ffd700;
      }
    }
  }

  @keyframes marquee {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }

  .stat-cards {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 24px;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #fff;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }

      .stat-info {
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #333;
        }

        .stat-label {
          font-size: 14px;
          color: #999;
          margin-top: 4px;
        }
      }
    }
  }

  .quick-actions {
    background: #fff;
    padding: 24px;
    border-radius: 12px;
    margin-bottom: 24px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

    h3 {
      margin: 0 0 20px;
      font-size: 16px;
      color: #333;
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 16px;

      @media (max-width: 1200px) {
        grid-template-columns: repeat(3, 1fr);
      }

      @media (max-width: 768px) {
        grid-template-columns: repeat(2, 1fr);
      }

      .action-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 20px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        background: #fafafa;

        &:hover {
          background: #f0f0f0;
          transform: translateY(-2px);
        }

        span {
          font-size: 14px;
          color: #666;
        }
      }
    }
  }

  .dashboard-content {
    display: grid;
    grid-template-columns: 1fr 400px;
    gap: 24px;

    @media (max-width: 1200px) {
      grid-template-columns: 1fr;
    }

    .content-section {
      background: #fff;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        h3 {
          margin: 0;
          font-size: 16px;
          color: #333;
        }
      }

      .chart-container {
        height: 300px;
      }
    }
  }
}
</style>
