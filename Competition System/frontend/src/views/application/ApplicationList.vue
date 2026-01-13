<template>
  <div class="page-container">
    <div class="page-header">
      <h1>申报列表</h1>
      <el-button v-if="userStore.isTeacher" type="primary" @click="router.push('/applications/create')">
        <el-icon><Plus /></el-icon> 新建申报
      </el-button>
    </div>

    <!-- 搜索表单 -->
    <div class="search-form">
      <el-select v-model="query.status" placeholder="申报状态" style="width: 150px" clearable>
        <el-option label="草稿" value="DRAFT" />
        <el-option label="待院级审核" value="PENDING_DEPARTMENT" />
        <el-option label="待校级审核" value="PENDING_SCHOOL" />
        <el-option label="已通过" value="APPROVED" />
        <el-option label="已驳回" value="REJECTED" />
        <el-option label="需修改" value="REVISION_REQUIRED" />
      </el-select>
      <el-button type="primary" @click="fetchData">搜索</el-button>
      <el-button @click="resetQuery">重置</el-button>
    </div>

    <!-- 数据表格 -->
    <el-table :data="applications" v-loading="loading" style="width: 100%">
      <el-table-column prop="competition.name" label="竞赛名称" min-width="200" />
      <el-table-column prop="competition.level" label="等级" width="80">
        <template #default="{ row }">
          <el-tag :type="getLevelType(row.competition?.level)">{{ row.competition?.level }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="teacher.name" label="主指导教师" width="120" />
      <el-table-column prop="coTeacher.name" label="第二指导" width="120">
        <template #default="{ row }">
          {{ row.coTeacher?.name || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="学生人数" width="100">
        <template #default="{ row }">
          {{ row.students?.length || 0 }}人
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
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="handleView(row)">查看</el-button>
          <el-button 
            v-if="canEdit(row)" 
            text 
            type="primary" 
            @click="handleEdit(row)"
          >编辑</el-button>
          <el-button 
            v-if="canDelete(row)" 
            text 
            type="danger" 
            @click="handleDelete(row)"
          >删除</el-button>
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { getMyApplications, getApplications, deleteApplication, Application } from '@/api/application';
import dayjs from 'dayjs';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const applications = ref<Application[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  pageSize: 10,
  status: '',
});

const fetchData = async () => {
  loading.value = true;
  try {
    const api = userStore.isTeacher ? getMyApplications : getApplications;
    const res = await api(query);
    applications.value = res.data || [];
    total.value = res.pagination?.total || 0;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  query.status = '';
  query.page = 1;
  fetchData();
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

const canEdit = (row: Application) => {
  return userStore.isTeacher && 
    row.teacherId === userStore.user?.id && 
    ['DRAFT', 'REJECTED', 'REVISION_REQUIRED'].includes(row.status);
};

const canDelete = (row: Application) => {
  return userStore.isTeacher && 
    row.teacherId === userStore.user?.id && 
    row.status === 'DRAFT';
};

const handleView = (row: Application) => {
  router.push(`/applications/${row.id}`);
};

const handleEdit = (row: Application) => {
  router.push({ path: '/applications/create', query: { id: row.id } });
};

const handleDelete = async (row: Application) => {
  try {
    await ElMessageBox.confirm('确定要删除这条申报吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await deleteApplication(row.id);
    ElMessage.success('删除成功');
    fetchData();
  } catch {
    // 取消删除
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
