<template>
  <div class="page-container">
    <div class="page-header">
      <h1>年度奖励统计</h1>
      <div class="header-actions">
        <el-select v-model="selectedYear" style="width: 120px" @change="fetchData">
          <el-option v-for="year in yearOptions" :key="year" :label="`${year}年`" :value="year" />
        </el-select>
        <el-button type="primary" @click="handleExport">
          <el-icon><Download /></el-icon> 导出报表
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card">
        <div class="stat-icon icon-money">
          <el-icon :size="28"><Money /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">¥{{ rewardData.totalReward?.toLocaleString() || 0 }}</div>
          <div class="stat-label">奖励总金额</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon icon-user">
          <el-icon :size="28"><User /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ rewardData.teacherCount || 0 }}</div>
          <div class="stat-label">获奖教师人数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon icon-medal">
          <el-icon :size="28"><Medal /></el-icon>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ rewardData.awardCount || 0 }}</div>
          <div class="stat-label">获奖总数</div>
        </div>
      </div>
    </div>

    <!-- 教师奖励列表 -->
    <el-card shadow="never" style="margin-top: 20px">
      <template #header>
        <span class="card-title">教师奖励明细</span>
      </template>
      <el-table :data="rewardData.rewardList || []" v-loading="loading" style="width: 100%">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column prop="teacher.name" label="教师姓名" width="100" />
        <el-table-column prop="teacher.employeeId" label="工号" width="120" />
        <el-table-column prop="teacher.department.name" label="学院" width="150" />
        <el-table-column prop="totalReward" label="奖励金额" width="120">
          <template #default="{ row }">
            ¥{{ row.totalReward?.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="获奖详情">
          <template #default="{ row }">
            <el-tooltip placement="top">
              <template #content>
                <div v-for="(award, index) in row.awards" :key="index" style="margin-bottom: 4px">
                  {{ award.competitionName }} - {{ getAwardLevelText(award.awardLevel) }} (¥{{ award.rewardAmount }})
                </div>
              </template>
              <el-link type="primary">{{ row.awards?.length || 0 }}项获奖</el-link>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="teacher.bankAccount" label="银行卡号" width="180">
          <template #default="{ row }">
            {{ row.teacher?.bankAccount ? maskBankAccount(row.teacher.bankAccount) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="teacher.bankName" label="开户行" width="150" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getAnnualRewards, exportAnnualRewards } from '@/api/reward';

const loading = ref(false);
const selectedYear = ref(new Date().getFullYear());
const rewardData = ref<any>({});

const yearOptions = computed(() => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear - i);
});

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getAnnualRewards(selectedYear.value);
    rewardData.value = res.data;
  } finally {
    loading.value = false;
  }
};

const handleExport = async () => {
  try {
    const res = await exportAnnualRewards(selectedYear.value);
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `年度奖励_${selectedYear.value}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

const getAwardLevelText = (level: string) => {
  const map: Record<string, string> = {
    'SPECIAL_PRIZE': '特等奖', 'FIRST_PRIZE': '一等奖', 'SECOND_PRIZE': '二等奖',
    'THIRD_PRIZE': '三等奖', 'EXCELLENCE': '优秀奖',
  };
  return map[level] || level;
};

const maskBankAccount = (account: string) => {
  if (account.length <= 8) return account;
  return account.slice(0, 4) + '****' + account.slice(-4);
};

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
.header-actions {
  display: flex;
  gap: 12px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;

  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 576px) {
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

      &.icon-money {
        background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
      }

      &.icon-user {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      &.icon-medal {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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
</style>
