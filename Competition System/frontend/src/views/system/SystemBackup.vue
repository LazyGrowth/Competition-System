<template>
  <div class="page-container">
    <div class="page-header">
      <h1>数据备份</h1>
      <el-button type="primary" :loading="backing" @click="handleBackup">
        <el-icon><Upload /></el-icon> 创建备份
      </el-button>
    </div>

    <el-alert
      title="备份说明"
      type="info"
      :closable="false"
      style="margin-bottom: 20px"
    >
      数据备份包含所有业务数据（竞赛、申报、获奖、绩效等）。建议定期备份以防数据丢失。
    </el-alert>

    <!-- 备份记录 -->
    <el-table :data="backups" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="filename" label="文件名" />
      <el-table-column prop="fileSize" label="文件大小" width="120">
        <template #default="{ row }">
          {{ formatFileSize(row.fileSize) }}
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button text type="primary" @click="handleRestore(row)">恢复</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @change="fetchData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getBackupRecords, createBackup, restoreBackup, BackupRecord } from '@/api/system';
import dayjs from 'dayjs';

const loading = ref(false);
const backing = ref(false);
const backups = ref<BackupRecord[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
});

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getBackupRecords(query);
    backups.value = res.data || [];
    total.value = res.pagination?.total || 0;
  } finally {
    loading.value = false;
  }
};

const handleBackup = async () => {
  backing.value = true;
  try {
    await createBackup();
    ElMessage.success('备份创建成功');
    fetchData();
  } finally {
    backing.value = false;
  }
};

const handleRestore = async (row: BackupRecord) => {
  try {
    await ElMessageBox.confirm(
      `确定要从备份 "${row.filename}" 恢复数据吗？此操作将覆盖当前数据！`,
      '警告',
      {
        confirmButtonText: '确定恢复',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
    
    await restoreBackup(row.id);
    ElMessage.success('数据恢复成功');
  } catch {
    // 取消恢复
  }
};

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss');

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
