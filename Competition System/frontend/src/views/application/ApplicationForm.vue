<template>
  <div class="page-container">
    <div class="page-header">
      <h1>{{ isEdit ? '编辑申报' : '新建申报' }}</h1>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      style="max-width: 800px"
      v-loading="loading"
    >
      <!-- 选择竞赛 -->
      <div class="form-section">
        <div class="section-title">选择竞赛</div>
        
        <el-form-item label="竞赛名称" prop="competitionId">
          <el-select
            v-model="form.competitionId"
            filterable
            remote
            reserve-keyword
            placeholder="搜索并选择竞赛"
            :remote-method="searchCompetitions"
            :loading="searchingCompetitions"
            style="width: 100%"
            @change="handleCompetitionChange"
          >
            <el-option
              v-for="item in competitionOptions"
              :key="item.id"
              :label="`${item.name} (${item.level}级 - ${item.year}年)`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <div v-if="selectedCompetition" class="competition-info">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="竞赛名称">{{ selectedCompetition.name }}</el-descriptions-item>
            <el-descriptions-item label="等级">
              <el-tag :type="getLevelType(selectedCompetition.level)">{{ selectedCompetition.level }}级</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="区域">{{ getRegionText(selectedCompetition.region) }}</el-descriptions-item>
            <el-descriptions-item label="年份">{{ selectedCompetition.year }}</el-descriptions-item>
            <el-descriptions-item label="届数">{{ selectedCompetition.session || '-' }}</el-descriptions-item>
            <el-descriptions-item label="赛道">{{ selectedCompetition.track || '-' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <!-- 指导教师 -->
      <div class="form-section">
        <div class="section-title">指导教师</div>
        
        <el-form-item label="主指导教师">
          <el-input :value="userStore.user?.name" disabled />
        </el-form-item>

        <el-form-item label="第二指导教师">
          <el-select
            v-model="form.coTeacherId"
            filterable
            remote
            reserve-keyword
            placeholder="选填，搜索教师"
            :remote-method="searchTeachers"
            :loading="searchingTeachers"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="item in teacherOptions"
              :key="item.id"
              :label="`${item.name} (${item.employeeId})`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </div>

      <!-- 参赛学生 -->
      <div class="form-section">
        <div class="section-title">参赛学生</div>

        <el-form-item label="添加学生" prop="studentIds">
          <div style="display: flex; gap: 10px; width: 100%">
            <el-select
              v-model="studentToAdd"
              filterable
              remote
              reserve-keyword
              placeholder="搜索学生（学号或姓名）"
              :remote-method="searchStudents"
              :loading="searchingStudents"
              style="flex: 1"
            >
              <el-option
                v-for="item in studentOptions"
                :key="item.id"
                :label="`${item.name} (${item.studentId})`"
                :value="item.id"
              />
            </el-select>
            <el-button type="primary" @click="addStudent">添加</el-button>
            <el-button @click="showCreateStudent = true">新建学生</el-button>
          </div>
        </el-form-item>

        <el-table :data="selectedStudents" style="width: 100%">
          <el-table-column prop="studentId" label="学号" width="120" />
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column prop="department.name" label="学院" />
          <el-table-column prop="major" label="专业" />
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button text type="danger" @click="removeStudent(row.id)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 提交按钮 -->
      <el-form-item>
        <el-button @click="router.back()">取消</el-button>
        <el-button type="info" :loading="saving" @click="handleSave('draft')">保存草稿</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave('submit')">提交申报</el-button>
      </el-form-item>
    </el-form>

    <!-- 新建学生对话框 -->
    <el-dialog v-model="showCreateStudent" title="新建学生" width="500px">
      <el-form :model="newStudent" label-width="80px">
        <el-form-item label="学号" required>
          <el-input v-model="newStudent.studentId" placeholder="请输入学号" />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="newStudent.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="专业">
          <el-input v-model="newStudent.major" placeholder="请输入专业" />
        </el-form-item>
        <el-form-item label="联系方式">
          <el-input v-model="newStudent.contact" placeholder="请输入联系方式" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateStudent = false">取消</el-button>
        <el-button type="primary" :loading="creatingStudent" @click="handleCreateStudent">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, FormInstance, FormRules } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { getCompetitions, Competition } from '@/api/competition';
import { getApplication, createApplication, updateApplication, submitApplication } from '@/api/application';
import { searchStudents as searchStudentsApi, createStudent, Student } from '@/api/student';
import { getUsers } from '@/api/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const formRef = ref<FormInstance>();
const loading = ref(false);
const saving = ref(false);

const isEdit = computed(() => !!route.query.id);
const applicationId = computed(() => route.query.id ? parseInt(route.query.id as string) : null);

const form = reactive({
  competitionId: undefined as number | undefined,
  coTeacherId: undefined as number | undefined,
  studentIds: [] as number[],
});

const rules: FormRules = {
  competitionId: [{ required: true, message: '请选择竞赛', trigger: 'change' }],
  studentIds: [{ type: 'array', min: 1, message: '请至少添加一名学生', trigger: 'change' }],
};

// 竞赛搜索
const searchingCompetitions = ref(false);
const competitionOptions = ref<Competition[]>([]);
const selectedCompetition = ref<Competition | null>(null);

const searchCompetitions = async (query: string) => {
  if (!query) return;
  searchingCompetitions.value = true;
  try {
    const res = await getCompetitions({ name: query, valid: true } as any);
    competitionOptions.value = res.data || [];
  } finally {
    searchingCompetitions.value = false;
  }
};

const handleCompetitionChange = (id: number) => {
  selectedCompetition.value = competitionOptions.value.find(c => c.id === id) || null;
};

// 教师搜索
const searchingTeachers = ref(false);
const teacherOptions = ref<any[]>([]);

const searchTeachers = async (query: string) => {
  if (!query) return;
  searchingTeachers.value = true;
  try {
    const res = await getUsers({ name: query, role: 'TEACHER' });
    teacherOptions.value = (res.data || []).filter((t: any) => t.id !== userStore.user?.id);
  } finally {
    searchingTeachers.value = false;
  }
};

// 学生搜索
const searchingStudents = ref(false);
const studentOptions = ref<Student[]>([]);
const selectedStudents = ref<Student[]>([]);
const studentToAdd = ref<number | undefined>(undefined);

const searchStudents = async (query: string) => {
  if (!query) return;
  searchingStudents.value = true;
  try {
    const res = await searchStudentsApi(query);
    studentOptions.value = res.data || [];
  } finally {
    searchingStudents.value = false;
  }
};

const addStudent = () => {
  if (!studentToAdd.value) return;
  const student = studentOptions.value.find(s => s.id === studentToAdd.value);
  if (student && !selectedStudents.value.find(s => s.id === student.id)) {
    selectedStudents.value.push(student);
    form.studentIds.push(student.id);
  }
  studentToAdd.value = undefined;
};

const removeStudent = (id: number) => {
  selectedStudents.value = selectedStudents.value.filter(s => s.id !== id);
  form.studentIds = form.studentIds.filter(sid => sid !== id);
};

// 新建学生
const showCreateStudent = ref(false);
const creatingStudent = ref(false);
const newStudent = reactive({
  studentId: '',
  name: '',
  major: '',
  contact: '',
});

const handleCreateStudent = async () => {
  if (!newStudent.studentId || !newStudent.name) {
    ElMessage.warning('请填写学号和姓名');
    return;
  }
  creatingStudent.value = true;
  try {
    const res = await createStudent(newStudent);
    selectedStudents.value.push(res.data);
    form.studentIds.push(res.data.id);
    ElMessage.success('学生创建成功');
    showCreateStudent.value = false;
    Object.assign(newStudent, { studentId: '', name: '', major: '', contact: '' });
  } finally {
    creatingStudent.value = false;
  }
};

// 辅助函数
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

// 保存/提交
const handleSave = async (action: 'draft' | 'submit') => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    saving.value = true;
    try {
      let id = applicationId.value;
      
      if (isEdit.value && id) {
        await updateApplication(id, {
          coTeacherId: form.coTeacherId,
          studentIds: form.studentIds,
        });
      } else {
        const res = await createApplication({
          competitionId: form.competitionId!,
          coTeacherId: form.coTeacherId,
          studentIds: form.studentIds,
        });
        id = res.data.id;
      }

      if (action === 'submit' && id) {
        await submitApplication(id);
        ElMessage.success('申报已提交，等待审核');
      } else {
        ElMessage.success('保存成功');
      }

      router.push('/applications');
    } finally {
      saving.value = false;
    }
  });
};

// 加载编辑数据
const loadApplication = async () => {
  if (!applicationId.value) return;
  
  loading.value = true;
  try {
    const res = await getApplication(applicationId.value);
    const app = res.data;
    
    form.competitionId = app.competitionId;
    form.coTeacherId = app.coTeacherId;
    form.studentIds = app.students.map((s: any) => s.student.id);
    
    selectedCompetition.value = app.competition;
    competitionOptions.value = [app.competition];
    selectedStudents.value = app.students.map((s: any) => s.student);
    
    if (app.coTeacher) {
      teacherOptions.value = [app.coTeacher];
    }
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  // 如果URL带有competitionId，预选竞赛
  const competitionId = route.query.competitionId;
  if (competitionId) {
    form.competitionId = parseInt(competitionId as string);
    searchCompetitions('');
  }
  
  if (isEdit.value) {
    loadApplication();
  }
});
</script>

<style lang="scss" scoped>
.competition-info {
  margin-top: 16px;
  margin-left: 120px;
}
</style>
