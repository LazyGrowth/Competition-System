<template>
  <div class="department-list">
    <div class="page-header">
      <h2>学院管理</h2>
      <el-button type="primary" @click="showAddDialog">
        <el-icon><Plus /></el-icon>
        添加学院
      </el-button>
    </div>

    <el-card>
      <el-table :data="departments" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="code" label="学院代码" width="120" />
        <el-table-column prop="name" label="学院名称" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑学院' : '添加学院'"
      width="500px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="学院代码" prop="code">
          <el-input v-model="form.code" placeholder="如: CS, EE, ME" />
        </el-form-item>
        <el-form-item label="学院名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入学院名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { get, post, put, del } from '@/api/request';

interface Department {
  id: number;
  code: string;
  name: string;
  createdAt: string;
}

const loading = ref(false);
const submitting = ref(false);
const departments = ref<Department[]>([]);
const dialogVisible = ref(false);
const isEdit = ref(false);
const editId = ref<number | null>(null);
const formRef = ref<FormInstance>();

const form = ref({
  code: '',
  name: '',
});

const rules = {
  code: [{ required: true, message: '请输入学院代码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入学院名称', trigger: 'blur' }],
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const fetchDepartments = async () => {
  loading.value = true;
  try {
    const res = await get<{ data: Department[] }>('/departments');
    departments.value = res.data || [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const showAddDialog = () => {
  isEdit.value = false;
  editId.value = null;
  form.value = { code: '', name: '' };
  dialogVisible.value = true;
};

const handleEdit = (row: Department) => {
  isEdit.value = true;
  editId.value = row.id;
  form.value = { code: row.code, name: row.name };
  dialogVisible.value = true;
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    
    submitting.value = true;
    try {
      if (isEdit.value && editId.value) {
        await put(`/departments/${editId.value}`, form.value);
        ElMessage.success('更新成功');
      } else {
        await post('/departments', form.value);
        ElMessage.success('添加成功');
      }
      dialogVisible.value = false;
      fetchDepartments();
    } catch (e) {
      console.error(e);
    } finally {
      submitting.value = false;
    }
  });
};

const handleDelete = async (row: Department) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除学院 "${row.name}" 吗？`,
      '确认删除',
      { type: 'warning' }
    );
    
    await del(`/departments/${row.id}`);
    ElMessage.success('删除成功');
    fetchDepartments();
  } catch (e) {
    // 用户取消或删除失败
  }
};

onMounted(() => {
  fetchDepartments();
});
</script>

<style scoped lang="scss">
.department-list {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h2 {
      margin: 0;
      font-size: 20px;
      color: #303133;
    }
  }
}
</style>
