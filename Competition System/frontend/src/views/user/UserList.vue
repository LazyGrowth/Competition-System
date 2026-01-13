<template>
  <div class="page-container">
    <div class="page-header">
      <h1>用户管理</h1>
      <el-button v-if="userStore.isSuperAdmin" type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon> 新增用户
      </el-button>
    </div>

    <!-- 搜索表单 -->
    <div class="search-form">
      <el-input v-model="query.name" placeholder="姓名/工号" style="width: 150px" clearable />
      <el-select v-model="query.role" placeholder="角色" style="width: 120px" clearable>
        <el-option label="超级管理员" value="SUPER_ADMIN" />
        <el-option label="校级管理员" value="SCHOOL_ADMIN" />
        <el-option label="院级管理员" value="DEPARTMENT_ADMIN" />
        <el-option label="教师" value="TEACHER" />
      </el-select>
      <el-button type="primary" @click="fetchData">搜索</el-button>
      <el-button @click="resetQuery">重置</el-button>
    </div>

    <!-- 数据表格 -->
    <el-table :data="users" v-loading="loading" style="width: 100%">
      <el-table-column prop="employeeId" label="工号" width="120" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="gender" label="性别" width="80" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="getRoleType(row.role)">{{ getRoleText(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="department.name" label="学院" />
      <el-table-column prop="performanceScore" label="绩效分" width="100" />
      <el-table-column prop="createdAt" label="创建时间" width="120">
        <template #default="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
      </el-table-column>
      <el-table-column v-if="userStore.isSuperAdmin" label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" @click="handleEdit(row)">编辑</el-button>
          <el-button text type="warning" @click="handleResetPassword(row)">重置密码</el-button>
          <el-button text type="danger" @click="handleDelete(row)">删除</el-button>
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
    <el-dialog v-model="showCreateDialog" :title="editingId ? '编辑用户' : '新增用户'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="工号" prop="employeeId">
          <el-input v-model="form.employeeId" placeholder="请输入工号" :disabled="!!editingId" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" :prop="editingId ? '' : 'password'">
          <el-input v-model="form.password" type="password" :placeholder="editingId ? '留空则不修改' : '请输入密码'" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio label="男">男</el-radio>
            <el-radio label="女">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="超级管理员" value="SUPER_ADMIN" />
            <el-option label="校级管理员" value="SCHOOL_ADMIN" />
            <el-option label="院级管理员" value="DEPARTMENT_ADMIN" />
            <el-option label="教师" value="TEACHER" />
          </el-select>
        </el-form-item>
        <el-form-item 
          label="所属学院" 
          :prop="['DEPARTMENT_ADMIN', 'TEACHER'].includes(form.role) ? 'departmentId' : ''"
        >
          <el-select 
            v-model="form.departmentId" 
            style="width: 100%" 
            placeholder="请选择学院"
            clearable
            :disabled="['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(form.role)"
          >
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
          <div v-if="['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(form.role)" class="el-form-item__tip">
            超级管理员和校级管理员无需选择学院
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="showResetDialog" title="重置密码" width="400px">
      <p>确定要将用户 <strong>{{ resetUser?.name }}</strong>（{{ resetUser?.employeeId }}）的密码重置为默认密码吗？</p>
      <p style="color: #909399; font-size: 13px; margin-top: 10px;">默认密码：123456</p>
      <template #footer>
        <el-button @click="showResetDialog = false">取消</el-button>
        <el-button type="warning" :loading="resetting" @click="confirmResetPassword">确认重置</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { getUsers, createUser, updateUser, deleteUser, resetPassword, User } from '@/api/user';
import { getDepartments } from '@/api/department';
import dayjs from 'dayjs';

const userStore = useUserStore();

const loading = ref(false);
const saving = ref(false);
const resetting = ref(false);
const users = ref<User[]>([]);
const departments = ref<any[]>([]);
const total = ref(0);
const showCreateDialog = ref(false);
const showResetDialog = ref(false);
const editingId = ref<number | null>(null);
const resetUser = ref<User | null>(null);
const formRef = ref<FormInstance>();

const query = reactive({
  page: 1,
  pageSize: 10,
  name: '',
  role: '',
});

const form = reactive({
  employeeId: '',
  name: '',
  password: '',
  gender: '男',
  role: 'TEACHER',
  departmentId: null as number | null,
});

const rules: FormRules = {
  employeeId: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  departmentId: [{ required: true, message: '请选择学院', trigger: 'change' }],
};

// 监听角色变化，清空学院选择
watch(() => form.role, (newRole) => {
  if (['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(newRole)) {
    form.departmentId = null;
  }
});

// 获取学院列表
const fetchDepartments = async () => {
  try {
    const res = await getDepartments();
    departments.value = res.data || [];
  } catch (e) {
    console.error(e);
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await getUsers(query);
    users.value = res.data || [];
    total.value = res.pagination?.total || 0;
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  query.name = '';
  query.role = '';
  query.page = 1;
  fetchData();
};

const getRoleType = (role: string) => {
  const map: Record<string, string> = {
    'SUPER_ADMIN': 'danger', 'SCHOOL_ADMIN': 'warning', 'DEPARTMENT_ADMIN': 'success', 'TEACHER': 'info',
  };
  return map[role] || '';
};

const getRoleText = (role: string) => {
  const map: Record<string, string> = {
    'SUPER_ADMIN': '超级管理员', 'SCHOOL_ADMIN': '校级管理员', 'DEPARTMENT_ADMIN': '院级管理员', 'TEACHER': '教师',
  };
  return map[role] || role;
};

const formatDate = (date: string) => dayjs(date).format('YYYY-MM-DD');

const handleEdit = (row: User) => {
  editingId.value = row.id;
  Object.assign(form, {
    employeeId: row.employeeId,
    name: row.name,
    password: '',
    gender: row.gender || '男',
    role: row.role,
    departmentId: (row as any).department?.id || null,
  });
  showCreateDialog.value = true;
};

const handleResetPassword = (row: User) => {
  resetUser.value = row;
  showResetDialog.value = true;
};

const confirmResetPassword = async () => {
  if (!resetUser.value) return;
  
  resetting.value = true;
  try {
    await resetPassword(resetUser.value.id);
    ElMessage.success('密码重置成功，新密码为：123456');
    showResetDialog.value = false;
    resetUser.value = null;
  } finally {
    resetting.value = false;
  }
};

const handleDelete = async (row: User) => {
  try {
    await ElMessageBox.confirm('确定要删除该用户吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await deleteUser(row.id);
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
      const data: any = { ...form };
      if (editingId.value && !data.password) {
        delete data.password;
      }
      // 超级管理员和校级管理员不需要学院
      if (['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(data.role)) {
        data.departmentId = null;
      }

      if (editingId.value) {
        await updateUser(editingId.value, data);
        ElMessage.success('用户更新成功');
      } else {
        await createUser(data);
        ElMessage.success('用户创建成功');
      }
      showCreateDialog.value = false;
      editingId.value = null;
      Object.assign(form, { employeeId: '', name: '', password: '', gender: '男', role: 'TEACHER', departmentId: null });
      fetchData();
    } finally {
      saving.value = false;
    }
  });
};

onMounted(() => {
  fetchData();
  fetchDepartments();
});
</script>

<style lang="scss" scoped>
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.el-form-item__tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
</style>
