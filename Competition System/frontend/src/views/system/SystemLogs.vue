<template>
  <div class="page-container">
    <div class="page-header">
      <h1>操作日志</h1>
    </div>

    <!-- 搜索表单 -->
    <div class="search-form">
      <el-input v-model="query.action" placeholder="操作类型" style="width: 150px" clearable />
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        style="width: 240px"
      />
      <el-button type="primary" @click="fetchData">搜索</el-button>
      <el-button @click="resetQuery">重置</el-button>
    </div>

    <!-- 数据表格 -->
    <el-table :data="logs" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="user.name" label="操作人" width="100">
        <template #default="{ row }">
          {{ row.user?.name || '系统' }}
        </template>
      </el-table-column>
      <el-table-column prop="user.role" label="角色" width="100">
        <template #default="{ row }">
          {{ getRoleText(row.user?.role) }}
        </template>
      </el-table-column>
      <el-table-column prop="action" label="操作" min-width="200" />
      <el-table-column prop="ip" label="IP地址" width="130" />
      <el-table-column prop="createdAt" label="操作时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column label="详情" width="80">
        <template #default="{ row }">
          <el-button v-if="row.details" text type="primary" @click="showDetails(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="query.page"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[20, 50, 100]"
        layout="total, sizes, prev, pager, next"
        @change="fetchData"
      />
    </div>

    <!-- 详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="操作详情" width="600px">
      <pre class="detail-content">{{ currentDetails }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { getOperationLogs, OperationLog } from '@/api/system';
import dayjs from 'dayjs';

const loading = ref(false);
const logs = ref<OperationLog[]>([]);
const total = ref(0);
const showDetailDialog = ref(false);
const currentDetails = ref('');
const dateRange = ref<[Date, Date] | null>(null);

const query = reactive({
  page: 1,
  pageSize: 20,
  action: '',
  startDate: undefined as string | undefined,
  endDate: undefined as string | undefined,
});

const fetchData = async () => {
  loading.value = true;
  
  if (dateRange.value) {
    query.startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD');
    query.endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD');
  } else {
    query.startDate = undefined;
    query.endDate = undefined;
  }

  try {
    const res = await getOperationLogs(query);
    logs.value = res.data || [];
    total.value = res.pagination?.total || 0;
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  query.action = '';
  query.page = 1;
  dateRange.value = null;
  fetchData();
};

const getRoleText = (role: string) => {
  const map: Record<string, string> = {
    'SUPER_ADMIN': '超级管理员', 'SCHOOL_ADMIN': '校级管理员',
    'DEPARTMENT_ADMIN': '院级管理员', 'TEACHER': '教师',
  };
  return map[role] || role || '-';
};

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss');

const showDetails = (row: OperationLog) => {
  try {
    currentDetails.value = JSON.stringify(JSON.parse(row.details || '{}'), null, 2);
  } catch {
    currentDetails.value = row.details || '';
  }
  showDetailDialog.value = true;
};

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

.detail-content {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  max-height: 400px;
  overflow: auto;
  font-size: 12px;
  line-height: 1.6;
}
</style>
