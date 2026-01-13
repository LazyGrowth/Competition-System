<template>
  <div class="page-container">
    <div class="page-header">
      <h1>数据统计</h1>
      <div class="header-actions">
        <el-select v-model="selectedYear" style="width: 120px" @change="fetchData">
          <el-option v-for="y in yearOptions" :key="y" :label="`${y}年`" :value="y" />
        </el-select>
        <el-select v-model="selectedSemester" style="width: 120px" @change="fetchData">
          <el-option label="全年" value="" />
          <el-option label="春季学期" value="spring" />
          <el-option label="秋季学期" value="autumn" />
        </el-select>
        <el-button v-if="userStore.isSchoolAdmin" type="primary" @click="handleExport" :loading="exporting">
          <el-icon><Download /></el-icon> 导出报表
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-icon blue">
          <el-icon :size="32"><List /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ overview.totalCompetitions || 0 }}</div>
          <div class="stat-label">竞赛总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">
          <el-icon :size="32"><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ overview.totalApplications || 0 }}</div>
          <div class="stat-label">申报总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">
          <el-icon :size="32"><Medal /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ overview.totalAwards || 0 }}</div>
          <div class="stat-label">获奖总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">
          <el-icon :size="32"><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ overview.totalTeachers || 0 }}</div>
          <div class="stat-label">教师人数</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="chart-section">
      <el-card shadow="never" class="chart-card">
        <template #header>
          <span class="card-title">竞赛等级分布</span>
        </template>
        <div ref="levelChartRef" class="chart-container"></div>
      </el-card>

      <el-card shadow="never" class="chart-card">
        <template #header>
          <span class="card-title">获奖等级统计</span>
        </template>
        <div ref="awardChartRef" class="chart-container"></div>
      </el-card>
    </div>

    <!-- 区域分布 -->
    <el-card shadow="never" style="margin-top: 20px">
      <template #header>
        <span class="card-title">区域分布</span>
      </template>
      <div ref="regionChartRef" class="chart-container" style="height: 300px;"></div>
    </el-card>

    <!-- 学院对比 -->
    <el-card v-if="userStore.isSchoolAdmin" shadow="never" style="margin-top: 20px">
      <template #header>
        <span class="card-title">学院对比</span>
      </template>
      <el-table 
        :data="departmentComparison" 
        style="width: 100%"
        :default-sort="{ prop: 'totalPerformance', order: 'descending' }"
      >
        <el-table-column type="index" label="排名" width="60" />
        <el-table-column prop="name" label="学院名称" sortable />
        <el-table-column prop="teacherCount" label="教师人数" width="100" sortable />
        <el-table-column prop="applicationCount" label="申报数" width="100" sortable />
        <el-table-column prop="awardCount" label="获奖数" width="100" sortable />
        <el-table-column prop="totalPerformance" label="绩效总分" width="100" sortable />
        <el-table-column prop="totalReward" label="奖励金额" width="120" sortable>
          <template #default="{ row }">
            ¥{{ Number(row.totalReward).toLocaleString() }}
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 教师排名（院级及以上管理员可见） -->
    <el-card v-if="userStore.isDepartmentAdmin" shadow="never" style="margin-top: 20px">
      <template #header>
        <span class="card-title">教师绩效排名 (Top 20)</span>
      </template>
      <el-table 
        :data="teacherRanking" 
        style="width: 100%"
        :default-sort="{ prop: 'performanceScore', order: 'descending' }"
      >
        <el-table-column prop="rank" label="排名" width="60" sortable />
        <el-table-column prop="name" label="教师姓名" sortable />
        <el-table-column prop="employeeId" label="工号" width="120" sortable />
        <el-table-column prop="department.name" label="学院" sortable />
        <el-table-column prop="performanceScore" label="绩效分" width="100" sortable>
          <template #default="{ row }">
            {{ Number(row.performanceScore).toFixed(1) }}
          </template>
        </el-table-column>
        <el-table-column prop="applicationCount" label="申报通过数" width="100" sortable />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Download } from '@element-plus/icons-vue';
import * as echarts from 'echarts';
import { useUserStore } from '@/stores/user';
import { getOverviewStats, getCompetitionStats, getDepartmentComparison, getTeacherRanking, exportStatistics } from '@/api/statistics';

const userStore = useUserStore();

const overview = ref<any>({});
const departmentComparison = ref<any[]>([]);
const teacherRanking = ref<any[]>([]);
const exporting = ref(false);

// 年份和学期选择
const currentYear = new Date().getFullYear();
const selectedYear = ref(currentYear);
const selectedSemester = ref('');
const yearOptions = computed(() => {
  const years = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y);
  }
  return years;
});

const levelChartRef = ref<HTMLElement>();
const regionChartRef = ref<HTMLElement>();
const awardChartRef = ref<HTMLElement>();
let levelChart: echarts.ECharts | null = null;
let regionChart: echarts.ECharts | null = null;
let awardChart: echarts.ECharts | null = null;

const fetchData = async () => {
  try {
    // 构建日期筛选参数
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    if (selectedSemester.value === 'spring') {
      startDate = `${selectedYear.value}-02-01`;
      endDate = `${selectedYear.value}-07-31`;
    } else if (selectedSemester.value === 'autumn') {
      startDate = `${selectedYear.value}-08-01`;
      endDate = `${selectedYear.value + 1}-01-31`;
    } else {
      startDate = `${selectedYear.value}-01-01`;
      endDate = `${selectedYear.value}-12-31`;
    }

    // 基础统计（所有角色可访问）
    const [overviewRes, statsRes] = await Promise.all([
      getOverviewStats({ startDate, endDate }),
      getCompetitionStats({ year: selectedYear.value }),
    ]);

    overview.value = overviewRes.data;

    // 初始化图表
    initLevelChart(statsRes.data.competitionsByLevel);
    initRegionChart(statsRes.data.competitionsByRegion);
    initAwardChart(statsRes.data.awardsByLevel);

    // 院级管理员及以上可查看教师排名
    if (userStore.isDepartmentAdmin) {
      const rankingRes = await getTeacherRanking({ limit: 20 });
      teacherRanking.value = rankingRes.data || [];
    }

    // 校级管理员获取学院对比
    if (userStore.isSchoolAdmin) {
      const deptRes = await getDepartmentComparison();
      departmentComparison.value = deptRes.data || [];
    }
  } catch (error) {
    console.error(error);
  }
};

const initLevelChart = (data: any[]) => {
  if (!levelChartRef.value) return;
  
  levelChart = echarts.init(levelChartRef.value);
  const option = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%', left: 'center' },
    series: [{
      name: '竞赛等级',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: false, position: 'center' },
      emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
      labelLine: { show: false },
      data: (data || []).map((item: any) => ({
        value: item._count,
        name: `${item.level}级竞赛`,
      })),
    }],
  };
  levelChart.setOption(option);
};

const initRegionChart = (data: any[]) => {
  if (!regionChartRef.value) return;

  const regionMap: Record<string, string> = { 'NATIONAL': '国赛', 'PROVINCIAL': '省赛', 'SCHOOL': '校赛' };
  
  regionChart = echarts.init(regionChartRef.value);
  const option = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: (data || []).map((item: any) => regionMap[item.region] || item.region),
    },
    yAxis: { type: 'value' },
    series: [{
      data: (data || []).map((item: any) => item._count),
      type: 'bar',
      itemStyle: {
        borderRadius: [8, 8, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#667eea' },
          { offset: 1, color: '#764ba2' },
        ]),
      },
    }],
  };
  regionChart.setOption(option);
};

const initAwardChart = (data: any[]) => {
  if (!awardChartRef.value) return;

  const awardLevelMap: Record<string, string> = {
    'SPECIAL_PRIZE': '特等奖',
    'FIRST_PRIZE': '一等奖',
    'SECOND_PRIZE': '二等奖',
    'THIRD_PRIZE': '三等奖',
    'EXCELLENCE': '优秀奖',
  };

  const colors = ['#f5222d', '#fa8c16', '#fadb14', '#52c41a', '#1890ff'];
  
  awardChart = echarts.init(awardChartRef.value);
  const option = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%', left: 'center' },
    series: [{
      name: '获奖等级',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}: {c}' },
      data: (data || []).map((item: any, index: number) => ({
        value: item._count,
        name: awardLevelMap[item.awardLevel] || item.awardLevel,
        itemStyle: { color: colors[index % colors.length] },
      })),
    }],
  };
  awardChart.setOption(option);
};

const handleExport = async () => {
  exporting.value = true;
  try {
    await exportStatistics({ 
      type: 'all', 
      year: selectedYear.value, 
      semester: selectedSemester.value || undefined 
    });
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  } finally {
    exporting.value = false;
  }
};

const handleResize = () => {
  levelChart?.resize();
  regionChart?.resize();
  awardChart?.resize();
};

onMounted(() => {
  fetchData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  levelChart?.dispose();
  regionChart?.dispose();
  awardChart?.dispose();
  window.removeEventListener('resize', handleResize);
});
</script>

<style lang="scss" scoped>
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;

  @media (max-width: 1400px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }

  .stat-card {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 24px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    transition: transform 0.2s, box-shadow 0.2s;

    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    .stat-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: #fff;

      &.blue {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      &.purple {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
      &.green {
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      }
      &.orange {
        background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%);
      }
    }

    .stat-content {
      flex: 1;
      min-width: 0;

      .stat-value {
        font-size: 32px;
        font-weight: 700;
        color: #303133;
        line-height: 1.2;
      }

      .stat-label {
        font-size: 14px;
        color: #909399;
        margin-top: 6px;
      }
    }
  }
}

.chart-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 20px;

  .chart-card {
    .chart-container {
      height: 300px;
    }
  }
}

.card-title {
  font-weight: 600;
}
</style>
