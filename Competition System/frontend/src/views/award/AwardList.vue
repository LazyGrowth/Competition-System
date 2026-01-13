<template>
  <div class="page-container">
    <div class="page-header">
      <h1>获奖记录</h1>
      <div class="header-actions">
        <el-button 
          v-if="!userStore.isTeacher && selectedIds.length > 0" 
          type="success" 
          @click="handleBatchExport"
          :loading="batchExporting"
        >
          <el-icon><Download /></el-icon> 批量导出 ({{ selectedIds.length }})
        </el-button>
        <el-button v-if="userStore.isTeacher" type="primary" @click="router.push('/awards/submit')">
          <el-icon><Plus /></el-icon> 提交获奖
        </el-button>
      </div>
    </div>

    <!-- 搜索表单 -->
    <div class="search-form">
      <el-select v-model="query.level" placeholder="获奖等级" style="width: 120px" clearable>
        <el-option label="特等奖" value="特等奖" />
        <el-option label="一等奖" value="一等奖" />
        <el-option label="二等奖" value="二等奖" />
        <el-option label="三等奖" value="三等奖" />
        <el-option label="优秀奖" value="优秀奖" />
      </el-select>
      <el-select v-model="query.status" placeholder="审核状态" style="width: 120px" clearable>
        <el-option label="待院级审核" value="PENDING_DEPARTMENT" />
        <el-option label="待校级审核" value="PENDING_SCHOOL" />
        <el-option label="已通过" value="APPROVED" />
        <el-option label="已驳回" value="REJECTED" />
      </el-select>
      <el-button type="primary" @click="fetchData">搜索</el-button>
      <el-button @click="resetQuery">重置</el-button>
    </div>

    <!-- 数据表格 -->
    <el-table 
      :data="awards" 
      v-loading="loading" 
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column v-if="!userStore.isTeacher" type="selection" width="55" />
      <el-table-column prop="application.competition.name" label="竞赛名称" min-width="200" />
      <el-table-column prop="application.competition.level" label="竞赛等级" width="100">
        <template #default="{ row }">
          <el-tag :type="getLevelType(row.application?.competition?.level)">
            {{ row.application?.competition?.level }}级
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="awardLevel" label="获奖等级" width="100">
        <template #default="{ row }">
          <el-tag type="warning">{{ getAwardLevelText(row.awardLevel) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="certificateNo" label="证书编号" width="120" />
      <el-table-column prop="application.teacher.name" label="指导教师" width="100" />
      <el-table-column prop="performanceScore" label="绩效分" width="80" />
      <el-table-column prop="rewardAmount" label="奖励金额" width="100">
        <template #default="{ row }">
          ¥{{ row.rewardAmount }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="approvedAt" label="通过时间" width="120">
        <template #default="{ row }">
          {{ row.approvedAt ? formatDate(row.approvedAt) : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="handleView(row)">查看</el-button>
          <el-button 
            text 
            type="success" 
            @click="handleDownload(row)"
            :loading="downloadingId === row.id"
          >
            下载
          </el-button>
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
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Download, Plus } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { getMyAwards, getAwards, Award, downloadAwardPdf, batchExportAwardPdf } from '@/api/award';
import dayjs from 'dayjs';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const awards = ref<Award[]>([]);
const total = ref(0);
const downloadingId = ref<number | null>(null);
const batchExporting = ref(false);
const selectedIds = ref<number[]>([]);

const query = reactive({
  page: 1,
  pageSize: 10,
  level: '',
  status: '',
});

const fetchData = async () => {
  loading.value = true;
  try {
    const api = userStore.isTeacher ? getMyAwards : getAwards;
    const res = await api(query as any);
    awards.value = res.data || [];
    total.value = res.pagination?.total || 0;
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  query.level = '';
  query.status = '';
  query.page = 1;
  fetchData();
};

const getLevelType = (level?: string): "success" | "info" | "warning" | "danger" | "" => {
  if (!level) return 'info';
  const map: Record<string, string> = { 'A': 'danger', 'B': 'warning', 'C': 'success', 'D': 'info', 'E': 'info' };
  return map[level] || 'info';
};

const getAwardLevelText = (level: string) => {
  const map: Record<string, string> = {
    'SPECIAL_PRIZE': '特等奖', 'FIRST_PRIZE': '一等奖', 'SECOND_PRIZE': '二等奖',
    'THIRD_PRIZE': '三等奖', 'EXCELLENCE': '优秀奖',
  };
  return map[level] || level;
};

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    'PENDING_DEPARTMENT': 'warning', 'PENDING_SCHOOL': 'warning', 'APPROVED': 'success', 'REJECTED': 'danger',
  };
  return map[status] || '';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'PENDING_DEPARTMENT': '待院级审核', 'PENDING_SCHOOL': '待校级审核', 'APPROVED': '已通过', 'REJECTED': '已驳回',
  };
  return map[status] || status;
};

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD');

const handleView = (row: Award) => {
  router.push(`/applications/${row.applicationId}`);
};

const handleSelectionChange = (selection: Award[]) => {
  selectedIds.value = selection.map(item => item.id);
};

const handleDownload = async (row: Award) => {
  downloadingId.value = row.id;
  try {
    await downloadAwardPdf(row.id, row.certificateNo);
    ElMessage.success('证书下载成功');
  } catch (error: any) {
    ElMessage.error(error.message || '下载失败');
  } finally {
    downloadingId.value = null;
  }
};

const handleBatchExport = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要导出的获奖记录');
    return;
  }

  batchExporting.value = true;
  try {
    await batchExportAwardPdf(selectedIds.value);
    ElMessage.success('批量导出成功');
  } catch (error: any) {
    ElMessage.error(error.message || '批量导出失败');
  } finally {
    batchExporting.value = false;
  }
};

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;

  h1 {
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
