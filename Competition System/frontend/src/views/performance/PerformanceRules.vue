<template>
  <div class="page-container">
    <div class="page-header">
      <h1>绩效规则设置</h1>
      <el-button type="primary" :loading="saving" @click="handleSave">保存规则</el-button>
    </div>

    <el-alert
      title="说明"
      type="info"
      :closable="false"
      style="margin-bottom: 20px"
    >
      设置不同竞赛等级和获奖等级对应的绩效分和工作量（学时）。修改后立即生效，但不会影响已审核通过的获奖记录。
    </el-alert>

    <el-table :data="rules" v-loading="loading" style="width: 100%">
      <el-table-column prop="competitionLevel" label="竞赛等级" width="120">
        <template #default="{ row }">
          <el-tag :type="getLevelType(row.competitionLevel)">{{ row.competitionLevel }}级</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="awardLevel" label="获奖等级" width="120">
        <template #default="{ row }">
          {{ getAwardLevelText(row.awardLevel) }}
        </template>
      </el-table-column>
      <el-table-column prop="performanceScore" label="绩效分" width="150">
        <template #default="{ row }">
          <el-input-number v-model="row.performanceScore" :min="0" :max="100" size="small" />
        </template>
      </el-table-column>
      <el-table-column prop="workload" label="工作量(学时)" width="150">
        <template #default="{ row }">
          <el-input-number v-model="row.workload" :min="0" :max="200" size="small" />
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getPerformanceRules, updatePerformanceRules, PerformanceRule } from '@/api/performance';

const loading = ref(false);
const saving = ref(false);
const rules = ref<PerformanceRule[]>([]);

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getPerformanceRules();
    // 将字符串转为数字（Prisma Decimal 类型返回的是字符串）
    rules.value = (res.data || []).map((rule: any) => ({
      ...rule,
      performanceScore: Number(rule.performanceScore) || 0,
      workload: Number(rule.workload) || 0,
    }));
    
    // 如果没有规则，初始化默认规则
    if (rules.value.length === 0) {
      initDefaultRules();
    }
  } finally {
    loading.value = false;
  }
};

const initDefaultRules = () => {
  const levels = ['A', 'B', 'C', 'D', 'E'];
  const awardLevels = ['SPECIAL_PRIZE', 'FIRST_PRIZE', 'SECOND_PRIZE', 'THIRD_PRIZE', 'EXCELLENCE'];
  
  rules.value = [];
  levels.forEach(level => {
    awardLevels.forEach(award => {
      rules.value.push({
        id: 0,
        competitionLevel: level,
        awardLevel: award,
        performanceScore: 0,
        workload: 0,
      });
    });
  });
};

const handleSave = async () => {
  saving.value = true;
  try {
    await updatePerformanceRules(rules.value);
    ElMessage.success('绩效规则保存成功');
  } finally {
    saving.value = false;
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

onMounted(() => {
  fetchData();
});
</script>
