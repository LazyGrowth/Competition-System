<template>
  <div class="page-container" v-loading="loading">
    <div class="page-header">
      <h1>申报详情</h1>
      <div class="header-actions">
        <el-button @click="router.back()">返回</el-button>
        <el-button 
          v-if="canSubmitAward" 
          type="success" 
          @click="router.push({ path: '/awards/submit', query: { applicationId: application?.id } })"
        >
          提交获奖
        </el-button>
      </div>
    </div>

    <template v-if="application">
      <!-- 状态信息 -->
      <el-card class="status-card" shadow="never">
        <div class="status-content">
          <el-tag :type="getStatusType(application.status)" size="large">
            {{ getStatusText(application.status) }}
          </el-tag>
          <span class="submit-time" v-if="application.submittedAt">
            提交时间：{{ formatDate(application.submittedAt) }}
          </span>
        </div>
      </el-card>

      <!-- 竞赛信息 -->
      <el-card shadow="never" style="margin-top: 20px">
        <template #header>
          <span class="card-title">竞赛信息</span>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="竞赛名称" :span="3">
            {{ application.competition?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="竞赛等级">
            <el-tag :type="getLevelType(application.competition?.level)">
              {{ application.competition?.level }}级
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="区域">
            {{ getRegionText(application.competition?.region) }}
          </el-descriptions-item>
          <el-descriptions-item label="年份">
            {{ application.competition?.year }}
          </el-descriptions-item>
          <el-descriptions-item label="届数">
            {{ application.competition?.session || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="赛道">
            {{ application.competition?.track || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="牵头院系">
            {{ application.competition?.leadDepartment?.name || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 指导教师 -->
      <el-card shadow="never" style="margin-top: 20px">
        <template #header>
          <span class="card-title">指导教师</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="主指导教师">
            {{ application.teacher?.name }} ({{ application.teacher?.employeeId }})
          </el-descriptions-item>
          <el-descriptions-item label="第二指导教师">
            {{ application.coTeacher ? `${application.coTeacher.name} (${application.coTeacher.employeeId})` : '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 参赛学生 -->
      <el-card shadow="never" style="margin-top: 20px">
        <template #header>
          <span class="card-title">参赛学生 ({{ application.students?.length || 0 }}人)</span>
        </template>
        <el-table :data="application.students" style="width: 100%">
          <el-table-column prop="student.studentId" label="学号" width="120" />
          <el-table-column prop="student.name" label="姓名" width="100" />
          <el-table-column prop="student.department.name" label="学院" />
          <el-table-column prop="student.major" label="专业" />
          <el-table-column prop="student.contact" label="联系方式" />
        </el-table>
      </el-card>

      <!-- 审批记录 -->
      <el-card shadow="never" style="margin-top: 20px">
        <template #header>
          <span class="card-title">审批记录</span>
        </template>
        <el-timeline v-if="application.approvalRecords?.length > 0">
          <el-timeline-item
            v-for="record in application.approvalRecords"
            :key="record.id"
            :type="getActionType(record.action)"
            :timestamp="formatDate(record.createdAt)"
          >
            <div class="approval-item">
              <span class="approver">{{ record.approver?.name }} ({{ getRoleText(record.approver?.role) }})</span>
              <el-tag :type="getActionType(record.action)" size="small">{{ getActionText(record.action) }}</el-tag>
            </div>
            <div class="comment" v-if="record.comment">
              审批意见：{{ record.comment }}
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无审批记录" />
      </el-card>

      <!-- 获奖信息 -->
      <el-card v-if="application.award" shadow="never" style="margin-top: 20px">
        <template #header>
          <span class="card-title">获奖信息</span>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="获奖等级">
            <el-tag type="warning">{{ getAwardLevelText(application.award.awardLevel) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="证书编号">
            {{ application.award.certificateNo }}
          </el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag :type="getAwardStatusType(application.award.status)">
              {{ getAwardStatusText(application.award.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="绩效分">
            {{ application.award.performanceScore }}
          </el-descriptions-item>
          <el-descriptions-item label="工作量">
            {{ application.award.workload }}学时
          </el-descriptions-item>
          <el-descriptions-item label="奖励金额">
            ¥{{ application.award.rewardAmount }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { getApplication, Application } from '@/api/application';
import { useUserStore } from '@/stores/user';
import dayjs from 'dayjs';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const loading = ref(false);
const application = ref<Application | null>(null);

const canSubmitAward = computed(() => {
  return application.value?.status === 'APPROVED' && 
    !application.value.award &&
    (application.value.teacherId === userStore.user?.id || application.value.coTeacherId === userStore.user?.id);
});

const fetchData = async () => {
  const id = parseInt(route.params.id as string);
  if (!id) {
    ElMessage.error('无效的申报ID');
    router.back();
    return;
  }

  loading.value = true;
  try {
    const res = await getApplication(id);
    application.value = res.data;
  } catch (error: any) {
    console.error('获取申报详情失败:', error);
    // 如果是权限错误，返回上一页
    if (error.response?.status === 403) {
      router.back();
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

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    'DRAFT': 'info', 'PENDING_DEPARTMENT': 'warning', 'PENDING_SCHOOL': 'warning',
    'APPROVED': 'success', 'REJECTED': 'danger', 'REVISION_REQUIRED': 'warning',
  };
  return map[status] || '';
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    'DRAFT': '草稿', 'PENDING_DEPARTMENT': '待院级审核', 'PENDING_SCHOOL': '待校级审核',
    'APPROVED': '已通过', 'REJECTED': '已驳回', 'REVISION_REQUIRED': '需修改',
  };
  return map[status] || status;
};

const getRegionText = (region: string) => {
  const map: Record<string, string> = { 'NATIONAL': '国赛', 'PROVINCIAL': '省赛', 'SCHOOL': '校赛' };
  return map[region] || region;
};

const getActionType = (action: string) => {
  const map: Record<string, string> = { 'APPROVE': 'success', 'REJECT': 'danger', 'REQUEST_REVISION': 'warning' };
  return map[action] || 'info';
};

const getActionText = (action: string) => {
  const map: Record<string, string> = { 'APPROVE': '通过', 'REJECT': '驳回', 'REQUEST_REVISION': '要求修改' };
  return map[action] || action;
};

const getRoleText = (role: string) => {
  const map: Record<string, string> = {
    'SUPER_ADMIN': '超级管理员', 'SCHOOL_ADMIN': '校级管理员',
    'DEPARTMENT_ADMIN': '院级管理员', 'TEACHER': '教师',
  };
  return map[role] || role;
};

const getAwardLevelText = (level: string) => {
  const map: Record<string, string> = {
    'SPECIAL_PRIZE': '特等奖', 'FIRST_PRIZE': '一等奖', 'SECOND_PRIZE': '二等奖',
    'THIRD_PRIZE': '三等奖', 'EXCELLENCE': '优秀奖',
  };
  return map[level] || level;
};

const getAwardStatusType = (status: string) => {
  const map: Record<string, string> = {
    'PENDING_DEPARTMENT': 'warning', 'PENDING_SCHOOL': 'warning', 'APPROVED': 'success', 'REJECTED': 'danger',
  };
  return map[status] || '';
};

const getAwardStatusText = (status: string) => {
  const map: Record<string, string> = {
    'PENDING_DEPARTMENT': '待院级审核', 'PENDING_SCHOOL': '待校级审核', 'APPROVED': '已通过', 'REJECTED': '已驳回',
  };
  return map[status] || status;
};

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm');

onMounted(() => {
  fetchData();
});
</script>

<style lang="scss" scoped>
.header-actions {
  display: flex;
  gap: 12px;
}

.status-card {
  .status-content {
    display: flex;
    align-items: center;
    gap: 20px;

    .submit-time {
      color: #999;
      font-size: 14px;
    }
  }
}

.card-title {
  font-weight: 600;
}

.approval-item {
  display: flex;
  align-items: center;
  gap: 10px;

  .approver {
    font-weight: 500;
  }
}

.comment {
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}
</style>
