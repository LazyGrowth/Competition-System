<template>
  <div class="page-container">
    <div class="page-header">
      <h1>竞赛列表</h1>
      <el-button v-if="userStore.isDepartmentAdmin" type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon> 新增竞赛
      </el-button>
    </div>

    <!-- 搜索表单 -->
    <div class="search-form">
      <el-input v-model="query.name" placeholder="竞赛名称" style="width: 200px" clearable />
      <el-select v-model="query.level" placeholder="竞赛等级" style="width: 120px" clearable>
        <el-option label="A级" value="A" />
        <el-option label="B级" value="B" />
        <el-option label="C级" value="C" />
        <el-option label="D级" value="D" />
        <el-option label="E级" value="E" />
      </el-select>
      <el-select v-model="query.region" placeholder="竞赛区域" style="width: 120px" clearable>
        <el-option label="国赛" value="NATIONAL" />
        <el-option label="省赛" value="PROVINCIAL" />
        <el-option label="校赛" value="SCHOOL" />
      </el-select>
      <el-input-number v-model="query.year" :min="2000" :max="2100" placeholder="年份" style="width: 120px" />
      <el-checkbox v-model="query.valid">仅显示有效</el-checkbox>
      <el-button type="primary" @click="fetchData">搜索</el-button>
      <el-button @click="resetQuery">重置</el-button>
    </div>

    <!-- 数据表格 -->
    <el-table :data="competitions" v-loading="loading" style="width: 100%">
      <el-table-column prop="name" label="竞赛名称" min-width="200" />
      <el-table-column prop="track" label="赛道" width="120" />
      <el-table-column prop="level" label="等级" width="80">
        <template #default="{ row }">
          <el-tag :type="getLevelType(row.level)">{{ row.level }}级</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="region" label="区域" width="100">
        <template #default="{ row }">
          {{ getRegionText(row.region) }}
        </template>
      </el-table-column>
      <el-table-column prop="year" label="年份" width="80" />
      <el-table-column prop="session" label="届数" width="100" />
      <el-table-column prop="leadDepartment.name" label="牵头院系" width="150" />
      <el-table-column prop="validUntil" label="有效期" width="120">
        <template #default="{ row }">
          {{ row.validUntil ? formatDate(row.validUntil) : '长期有效' }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="handleView(row)">详情</el-button>
          <el-button v-if="userStore.isDepartmentAdmin" text type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button v-if="userStore.isTeacher" text type="success" @click="handleApply(row)">申报</el-button>
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

    <!-- 详情弹窗 -->
    <el-dialog v-model="showDetailDialog" title="竞赛详情" width="650px">
      <div v-if="currentCompetition" class="competition-detail">
        <div class="detail-header">
          <h2>{{ currentCompetition.name }}</h2>
          <el-tag :type="getLevelType(currentCompetition.level)" size="large">
            {{ currentCompetition.level }}级竞赛
          </el-tag>
        </div>
        
        <el-descriptions :column="2" border style="margin-top: 20px">
          <el-descriptions-item label="赛道">
            {{ currentCompetition.track || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="区域">
            <el-tag type="info">{{ getRegionText(currentCompetition.region) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="年份">
            {{ currentCompetition.year }}年
          </el-descriptions-item>
          <el-descriptions-item label="届数">
            {{ currentCompetition.session || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="牵头院系">
            {{ currentCompetition.leadDepartment?.name || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="榜单排名" v-if="['A', 'B'].includes(currentCompetition.level)">
            第{{ currentCompetition.ranking || '-' }}名
          </el-descriptions-item>
          <el-descriptions-item label="是否需经费">
            <el-tag :type="currentCompetition.requiresFunding ? 'warning' : 'info'">
              {{ currentCompetition.requiresFunding ? '需要经费' : '不需要' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="有效期">
            <span :class="{ 'text-danger': isExpired(currentCompetition.validUntil) }">
              {{ currentCompetition.validUntil ? formatDate(currentCompetition.validUntil) : '长期有效' }}
              <el-tag v-if="isExpired(currentCompetition.validUntil)" type="danger" size="small" style="margin-left: 8px">已过期</el-tag>
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">
            {{ formatDateTime(currentCompetition.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间" :span="2">
            {{ formatDateTime(currentCompetition.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-actions">
          <el-button v-if="userStore.isTeacher" type="success" @click="handleApply(currentCompetition)">
            <el-icon><Plus /></el-icon> 申报此竞赛
          </el-button>
          <el-button v-if="userStore.isDepartmentAdmin" type="primary" @click="handleEditFromDetail">
            <el-icon><Edit /></el-icon> 编辑
          </el-button>
          <el-button @click="showDetailDialog = false">关闭</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingId ? '编辑竞赛' : '新增竞赛'"
      width="600px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="竞赛名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入竞赛名称" />
        </el-form-item>
        <el-form-item label="赛道" prop="track">
          <el-input v-model="form.track" placeholder="请输入赛道" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="竞赛等级" prop="level">
              <el-select v-model="form.level" style="width: 100%">
                <el-option label="A级" value="A" />
                <el-option label="B级" value="B" />
                <el-option label="C级" value="C" />
                <el-option label="D级" value="D" />
                <el-option label="E级" value="E" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="区域" prop="region">
              <el-select v-model="form.region" style="width: 100%">
                <el-option label="国赛" value="国赛" />
                <el-option label="省赛" value="省赛" />
                <el-option label="校赛" value="校赛" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年份" prop="year">
              <el-input-number v-model="form.year" :min="2000" :max="2100" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="届数" prop="session">
              <el-input v-model="form.session" placeholder="如：第15届" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item v-if="['A', 'B'].includes(form.level)" label="排名" prop="ranking">
          <el-input-number v-model="form.ranking" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="有效期">
          <el-date-picker v-model="form.validUntil" type="date" placeholder="不填则长期有效" style="width: 100%" />
        </el-form-item>
        <el-form-item label="是否需经费">
          <el-switch v-model="form.requiresFunding" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { getCompetitions, createCompetition, updateCompetition, Competition } from '@/api/competition';
import dayjs from 'dayjs';

const router = useRouter();
const userStore = useUserStore();

const loading = ref(false);
const saving = ref(false);
const competitions = ref<Competition[]>([]);
const total = ref(0);
const showCreateDialog = ref(false);
const showDetailDialog = ref(false);
const currentCompetition = ref<Competition | null>(null);
const editingId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const query = reactive({
  page: 1,
  pageSize: 10,
  name: '',
  level: '',
  region: '',
  year: undefined as number | undefined,
  valid: true,
});

const form = reactive({
  name: '',
  track: '',
  level: 'C',
  region: '省赛',
  year: new Date().getFullYear(),
  session: '',
  ranking: undefined as number | undefined,
  validUntil: undefined as Date | undefined,
  requiresFunding: false,
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入竞赛名称', trigger: 'blur' }],
  level: [{ required: true, message: '请选择竞赛等级', trigger: 'change' }],
  region: [{ required: true, message: '请选择区域', trigger: 'change' }],
  year: [{ required: true, message: '请输入年份', trigger: 'blur' }],
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getCompetitions({
      ...query,
      valid: query.valid ? 'true' : undefined,
    } as any);
    competitions.value = res.data || [];
    total.value = res.pagination?.total || 0;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  query.name = '';
  query.level = '';
  query.region = '';
  query.year = undefined;
  query.valid = true;
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

const getRegionText = (region: string) => {
  const map: Record<string, string> = {
    'NATIONAL': '国赛',
    'PROVINCIAL': '省赛',
    'SCHOOL': '校赛',
  };
  return map[region] || region;
};

const formatDate = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD');
};

const formatDateTime = (date: string) => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

const isExpired = (date?: string) => {
  if (!date) return false;
  return dayjs(date).isBefore(dayjs());
};

const handleView = (row: Competition) => {
  currentCompetition.value = row;
  showDetailDialog.value = true;
};

const handleEditFromDetail = () => {
  if (currentCompetition.value) {
    handleEdit(currentCompetition.value);
    showDetailDialog.value = false;
  }
};

const handleEdit = (row: Competition) => {
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    track: row.track || '',
    level: row.level,
    region: getRegionText(row.region),
    year: row.year,
    session: row.session || '',
    ranking: row.ranking,
    validUntil: row.validUntil ? new Date(row.validUntil) : undefined,
    requiresFunding: row.requiresFunding,
  });
  showCreateDialog.value = true;
};

const handleApply = (row: Competition) => {
  router.push({ path: '/applications/create', query: { competitionId: row.id } });
};

const handleSave = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    saving.value = true;
    try {
      if (editingId.value) {
        await updateCompetition(editingId.value, form);
        ElMessage.success('竞赛更新成功');
      } else {
        await createCompetition(form);
        ElMessage.success('竞赛创建成功');
      }
      showCreateDialog.value = false;
      editingId.value = null;
      fetchData();
    } catch (error) {
      // 错误已在拦截器中处理
    } finally {
      saving.value = false;
    }
  });
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

.competition-detail {
  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 1px solid #eee;

    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #333;
    }
  }

  .detail-actions {
    margin-top: 24px;
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .text-danger {
    color: #f56c6c;
  }
}
</style>
