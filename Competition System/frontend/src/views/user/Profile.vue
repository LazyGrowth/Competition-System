<template>
  <div class="page-container">
    <div class="page-header">
      <h1>个人中心</h1>
    </div>

    <div class="profile-content">
      <!-- 用户信息卡片 -->
      <el-card shadow="never" class="profile-card">
        <div class="user-avatar">
          <el-avatar :size="80">{{ userStore.user?.name?.charAt(0) || 'U' }}</el-avatar>
          <div class="user-meta">
            <h2>{{ userStore.user?.name }}</h2>
            <el-tag :type="getRoleType(userStore.user?.role)">{{ userStore.roleText }}</el-tag>
          </div>
        </div>

        <el-descriptions :column="2" border style="margin-top: 20px">
          <el-descriptions-item label="工号">{{ userStore.user?.employeeId }}</el-descriptions-item>
          <el-descriptions-item label="性别">{{ userStore.user?.gender || '未填写' }}</el-descriptions-item>
          <el-descriptions-item label="学院">{{ userStore.user?.department?.name || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="绩效分">{{ userStore.user?.performanceScore || 0 }}</el-descriptions-item>
        </el-descriptions>

        <el-alert
          v-if="userStore.user?.monthlyEditInfo"
          :title="`本月信息修改：已修改 ${userStore.user.monthlyEditInfo.count} 次，剩余免费次数：${Math.max(0, userStore.user.monthlyEditInfo.remaining)}`"
          :type="userStore.user.monthlyEditInfo.remaining <= 0 ? 'warning' : 'info'"
          :closable="false"
          style="margin-top: 20px"
        >
          <template v-if="userStore.user.monthlyEditInfo.remaining <= 0" #default>
            <p style="margin: 5px 0 0; font-size: 13px;">
              ⚠️ 免费次数已用完，后续修改将扣除绩效分（每次1分）
              <span v-if="currentScore < 1" style="color: #f56c6c; font-weight: bold;">
                - 当前绩效分不足，无法修改！
              </span>
            </p>
          </template>
        </el-alert>
      </el-card>

      <!-- 编辑信息 -->
      <el-card shadow="never" style="margin-top: 20px">
        <template #header>
          <span class="card-title">编辑个人信息</span>
        </template>
        
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" style="max-width: 500px">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="form.name" placeholder="请输入姓名" />
          </el-form-item>
          <el-form-item label="性别" prop="gender">
            <el-radio-group v-model="form.gender">
              <el-radio label="男">男</el-radio>
              <el-radio label="女">女</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="银行卡号" prop="bankAccount">
            <el-input v-model="form.bankAccount" placeholder="用于奖励发放" />
          </el-form-item>
          <el-form-item label="开户行" prop="bankName">
            <el-input v-model="form.bankName" placeholder="请输入开户行名称" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 修改密码 -->
      <el-card shadow="never" style="margin-top: 20px">
        <template #header>
          <span class="card-title">修改密码</span>
        </template>
        
        <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-width="100px" style="max-width: 500px">
          <el-form-item label="原密码" prop="oldPassword">
            <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入原密码" show-password />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码" show-password />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="changingPassword" @click="handleChangePassword">修改密码</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox, FormInstance, FormRules } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { updateMyProfile } from '@/api/user';
import { changePassword } from '@/api/auth';

const userStore = useUserStore();

const formRef = ref<FormInstance>();
const passwordFormRef = ref<FormInstance>();
const saving = ref(false);
const changingPassword = ref(false);

const form = reactive({
  name: '',
  gender: '男',
  bankAccount: '',
  bankName: '',
});

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
};

const passwordRules: FormRules = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

// 计算是否需要扣分
const needPenalty = computed(() => {
  const editInfo = userStore.user?.monthlyEditInfo;
  return editInfo && editInfo.remaining <= 0;
});

// 计算当前绩效分
const currentScore = computed(() => {
  return Number(userStore.user?.performanceScore) || 0;
});

const getRoleType = (role: string | undefined) => {
  const map: Record<string, string> = {
    'SUPER_ADMIN': 'danger', 'SCHOOL_ADMIN': 'warning', 'DEPARTMENT_ADMIN': 'success', 'TEACHER': 'info',
  };
  return map[role || ''] || '';
};

const loadProfile = () => {
  if (userStore.user) {
    form.name = userStore.user.name;
    form.gender = userStore.user.gender || '男';
  }
};

const handleSave = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    // 如果需要扣分，先检查绩效分是否足够
    if (needPenalty.value) {
      if (currentScore.value < 1) {
        ElMessage.error(`绩效分不足，无法修改。当前绩效分：${currentScore.value}，本次修改需扣除：1分`);
        return;
      }
      
      // 弹出确认对话框
      try {
        await ElMessageBox.confirm(
          `本月已超过免费修改次数，本次修改将扣除 1 绩效分。当前绩效分：${currentScore.value}，确定要继续吗？`,
          '扣分提醒',
          {
            confirmButtonText: '确定修改',
            cancelButtonText: '取消',
            type: 'warning',
          }
        );
      } catch {
        return; // 用户取消
      }
    }

    saving.value = true;
    try {
      await updateMyProfile(form);
      await userStore.fetchProfile();
      ElMessage.success('个人信息更新成功');
    } finally {
      saving.value = false;
    }
  });
};

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return;

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return;

    changingPassword.value = true;
    try {
      await changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      ElMessage.success('密码修改成功');
      passwordFormRef.value?.resetFields();
    } finally {
      changingPassword.value = false;
    }
  });
};

onMounted(() => {
  loadProfile();
});
</script>

<style lang="scss" scoped>
.profile-card {
  .user-avatar {
    display: flex;
    align-items: center;
    gap: 20px;

    .user-meta {
      h2 {
        margin: 0 0 8px;
        font-size: 24px;
      }
    }
  }
}

.card-title {
  font-weight: 600;
}
</style>
