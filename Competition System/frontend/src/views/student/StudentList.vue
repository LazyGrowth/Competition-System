<template>
  <div class="page-container">
    <div class="page-header">
      <h1>学生管理</h1>
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon> 新增学生
      </el-button>
    </div>

    <!-- 搜索表单 -->
    <div class="search-form">
      <el-input v-model="searchKeyword" placeholder="搜索学号或姓名" style="width: 200px" clearable @keyup.enter="handleSearch" />
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button @click="resetSearch">重置</el-button>
    </div>

    <!-- 数据表格 -->
    <el-table :data="students" v-loading="loading" style="width: 100%">
      <el-table-column prop="studentId" label="学号" width="120" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="department.name" label="学院" />
      <el-table-column prop="major" label="专业" />
      <el-table-column prop="contact" label="联系方式" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button v-if="userStore.isDepartmentAdmin" text type="danger" @click="handleDelete(row)">删除</el-button>
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

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="showCreateDialog" :title="editingId ? '编辑学生' : '新增学生'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="学号" prop="studentId">
          <el-input v-model="form.studentId" placeholder="请输入学号" :disabled="!!editingId" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="专业" prop="major">
          <el-input v-model="form.major" placeholder="请输入专业" />
        </el-form-item>
        <el-form-item label="联系方式" prop="contact">
          <el-input v-model="form.contact" placeholder="请输入联系方式" />
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
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { getStudents, createStudent, updateStudent, deleteStudent, searchStudents, Student } from '@/api/student';

const userStore = useUserStore();

const loading = ref(false);
const saving = ref(false);
const students = ref<Student[]>([]);
const total = ref(0);
const showCreateDialog = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref<FormInstance>();
const searchKeyword = ref('');

const query = reactive({
  page: 1,
  pageSize: 10,
});

const form = reactive({
  studentId: '',
  name: '',
  major: '',
  contact: '',
});

const rules: FormRules = {
  studentId: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getStudents(query);
    students.value = res.data || [];
    total.value = res.pagination?.total || 0;
  } finally {
    loading.value = false;
  }
};

const handleSearch = async () => {
  if (searchKeyword.value) {
    loading.value = true;
    try {
      const res = await searchStudents(searchKeyword.value);
      students.value = res.data || [];
      total.value = students.value.length;
    } finally {
      loading.value = false;
    }
  } else {
    fetchData();
  }
};

const resetSearch = () => {
  searchKeyword.value = '';
  query.page = 1;
  fetchData();
};

const handleEdit = (row: Student) => {
  editingId.value = row.id;
  Object.assign(form, {
    studentId: row.studentId,
    name: row.name,
    major: row.major || '',
    contact: row.contact || '',
  });
  showCreateDialog.value = true;
};

const handleDelete = async (row: Student) => {
  try {
    await ElMessageBox.confirm('确定要删除该学生吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await deleteStudent(row.id);
    ElMessage.success('删除成功');
    fetchData();
  } catch {
    // 取消删除
  }
};

const handleSave = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    saving.value = true;
    try {
      if (editingId.value) {
        await updateStudent(editingId.value, form);
        ElMessage.success('学生信息更新成功');
      } else {
        await createStudent(form);
        ElMessage.success('学生创建成功');
      }
      showCreateDialog.value = false;
      editingId.value = null;
      Object.assign(form, { studentId: '', name: '', major: '', contact: '' });
      fetchData();
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
</style>
