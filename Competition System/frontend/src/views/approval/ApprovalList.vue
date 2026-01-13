<template>
  <div class="page-container">
    <div class="page-header">
      <h1>审批管理</h1>
    </div>

    <el-tabs v-model="activeTab" @tab-change="fetchData">
      <el-tab-pane label="申报审批" name="application" />
      <el-tab-pane label="获奖审批" name="award" />
    </el-tabs>

    <!-- 数据表格 -->
    <el-table :data="pendingList" v-loading="loading" style="width: 100%">
      <template v-if="activeTab === 'application'">
        <el-table-column prop="competition.name" label="竞赛名称" min-width="200" />
        <el-table-column prop="competition.level" label="等级" width="80">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.competition?.level)">{{ row.competition?.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="teacher.name" label="申报教师" width="120" />
        <el-table-column prop="teacher.department.name" label="所属学院" width="150" />
        <el-table-column label="学生人数" width="100">
          <template #default="{ row }">
            {{ row.students?.length || 0 }}人
          </template>
        </el-table-column>
        <el-table-column prop="submittedAt" label="提交时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.submittedAt) }}
          </template>
        </el-table-column>
      </template>
      
      <template v-else>
        <el-table-column prop="application.competition.name" label="竞赛名称" min-width="200" />
        <el-table-column prop="awardLevel" label="获奖等级" width="100">
          <template #default="{ row }">
            <el-tag type="warning">{{ getAwardLevelText(row.awardLevel) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="certificateNo" label="证书编号" width="120" />
        <el-table-column prop="application.teacher.name" label="教师" width="100" />
        <el-table-column prop="createdAt" label="提交时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
      </template>

      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="handleView(row)">查看</el-button>
          <el-button text type="success" @click="handleApprove(row, 'APPROVE')">通过</el-button>
          <el-button text type="warning" @click="handleApprove(row, 'REQUEST_REVISION')">退回修改</el-button>
          <el-button text type="danger" @click="handleApprove(row, 'REJECT')">驳回</el-button>
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

    <!-- 审批对话框 -->
    <el-dialog v-model="showApprovalDialog" :title="approvalTitle" width="500px">
      <el-form :model="approvalForm" label-width="80px">
        <el-form-item label="审批意见">
          <el-input
            v-model="approvalForm.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入审批意见（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showApprovalDialog = false">取消</el-button>
        <el-button :type="approvalButtonType" :loading="approving" @click="submitApproval">
          {{ approvalButtonText }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { getPendingApprovals, approveApplication } from '@/api/approval';
import { getAwards, approveAward } from '@/api/award';
import dayjs from 'dayjs';

const router = useRouter();
const userStore = useUserStore();

const activeTab = ref('application');
const loading = ref(false);
const approving = ref(false);
const pendingList = ref<any[]>([]);
const total = ref(0);
const showApprovalDialog = ref(false);
const currentItem = ref<any>(null);
const currentAction = ref<'APPROVE' | 'REJECT' | 'REQUEST_REVISION'>('APPROVE');

const query = reactive({
  page: 1,
  pageSize: 10,
});

const approvalForm = reactive({
  comment: '',
});

const approvalTitle = computed(() => {
  const map = { 'APPROVE': '审批通过', 'REJECT': '驳回', 'REQUEST_REVISION': '退回修改' };
  return map[currentAction.value];
});

const approvalButtonType = computed(() => {
  const map: Record<string, string> = { 'APPROVE': 'success', 'REJECT': 'danger', 'REQUEST_REVISION': 'warning' };
  return map[currentAction.value];
});

const approvalButtonText = computed(() => {
  const map = { 'APPROVE': '确认通过', 'REJECT': '确认驳回', 'REQUEST_REVISION': '确认退回' };
  return map[currentAction.value];
});

const fetchData = async () => {
  loading.value = true;
  try {
    if (activeTab.value === 'application') {
      const res = await getPendingApprovals(query);
      pendingList.value = res.data || [];
      total.value = res.pagination?.total || 0;
    } else {
      // 根据用户角色确定要查询的状态
      // 只有纯院级管理员才查询 PENDING_DEPARTMENT，校级及以上查询 PENDING_SCHOOL
      const awardStatus = userStore.user?.role === 'DEPARTMENT_ADMIN' ? 'PENDING_DEPARTMENT' : 'PENDING_SCHOOL';
      const res = await getAwards({ ...query, status: awardStatus } as any);
      pendingList.value = res.data || [];
      total.value = res.pagination?.total || 0;
    }
  } finally {
    loading.value = false;
  }
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

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm');

const handleView = (row: any) => {
  if (activeTab.value === 'application') {
    router.push(`/applications/${row.id}`);
  } else {
    router.push(`/awards/${row.id}`);
  }
};

const handleApprove = (row: any, action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION') => {
  currentItem.value = row;
  currentAction.value = action;
  approvalForm.comment = '';
  showApprovalDialog.value = true;
};

const submitApproval = async () => {
  approving.value = true;
  try {
    if (activeTab.value === 'application') {
      await approveApplication(currentItem.value.id, {
        action: currentAction.value,
        comment: approvalForm.comment,
      });
    } else {
      await approveAward(currentItem.value.id, {
        action: currentAction.value as any,
        comment: approvalForm.comment,
      });
    }
    ElMessage.success('审批成功');
    showApprovalDialog.value = false;
    fetchData();
  } finally {
    approving.value = false;
  }
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
</style>
