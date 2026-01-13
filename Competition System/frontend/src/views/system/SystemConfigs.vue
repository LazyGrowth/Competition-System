<template>
  <div class="page-container">
    <div class="page-header">
      <h1>系统配置</h1>
    </div>

    <el-table :data="configs" v-loading="loading" style="width: 100%">
      <el-table-column prop="key" label="配置项" width="200" />
      <el-table-column prop="comment" label="说明" />
      <el-table-column prop="value" label="值" width="200">
        <template #default="{ row }">
          <el-input v-model="row.value" size="small" @blur="handleUpdate(row)" />
        </template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.updatedAt) }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getSystemConfigs, updateSystemConfig, SystemConfig } from '@/api/system';
import dayjs from 'dayjs';

const loading = ref(false);
const configs = ref<SystemConfig[]>([]);

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getSystemConfigs();
    configs.value = res.data || [];
  } finally {
    loading.value = false;
  }
};

const handleUpdate = async (row: SystemConfig) => {
  try {
    await updateSystemConfig(row.key, row.value, row.comment);
    ElMessage.success('配置更新成功');
  } catch (error) {
    fetchData();
  }
};

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm');

onMounted(() => {
  fetchData();
});
</script>
