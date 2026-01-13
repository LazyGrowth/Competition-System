<template>
  <div class="page-container">
    <div class="page-header">
      <h1>提交获奖记录</h1>
    </div>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      style="max-width: 600px"
    >
      <el-form-item label="选择申报" prop="applicationId">
        <el-select
          v-model="form.applicationId"
          filterable
          placeholder="选择已通过的申报"
          style="width: 100%"
          @change="handleApplicationChange"
        >
          <el-option
            v-for="item in approvedApplications"
            :key="item.id"
            :label="`${item.competition?.name} (${item.competition?.year}年)`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>

      <div v-if="selectedApplication" class="application-info">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="竞赛名称" :span="2">
            {{ selectedApplication.competition?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="竞赛等级">
            <el-tag :type="getLevelType(selectedApplication.competition?.level)">
              {{ selectedApplication.competition?.level }}级
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="年份">
            {{ selectedApplication.competition?.year }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-form-item label="获奖等级" prop="awardLevel">
        <el-select v-model="form.awardLevel" placeholder="请选择获奖等级" style="width: 100%">
          <el-option label="特等奖" value="特等奖" />
          <el-option label="一等奖" value="一等奖" />
          <el-option label="二等奖" value="二等奖" />
          <el-option label="三等奖" value="三等奖" />
          <el-option label="优秀奖" value="优秀奖" />
        </el-select>
      </el-form-item>

      <el-form-item label="证书编号" prop="certificateNo">
        <el-input v-model="form.certificateNo" placeholder="请输入获奖证书上的编号，如 3-1" />
      </el-form-item>

      <el-form-item label="总结PDF" prop="summaryPdf">
        <el-upload
          ref="uploadRef"
          class="upload-demo"
          :auto-upload="false"
          :limit="1"
          accept=".pdf"
          :on-change="handleFileChange"
          :on-exceed="handleExceed"
        >
          <template #trigger>
            <el-button type="primary">选择文件</el-button>
          </template>
          <template #tip>
            <div class="el-upload__tip">
              只能上传PDF文件，大小不超过10MB
            </div>
          </template>
        </el-upload>
        <div v-if="selectedFile" class="selected-file">
          <el-icon><Document /></el-icon>
          <span>{{ selectedFile.name }}</span>
          <el-button text type="danger" size="small" @click="clearFile">移除</el-button>
        </div>
      </el-form-item>

      <el-form-item>
        <el-button @click="router.back()">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, FormInstance, FormRules, UploadInstance, UploadFile } from 'element-plus';
import { getMyApplications } from '@/api/application';
import { createAward } from '@/api/award';

const router = useRouter();
const route = useRoute();

const formRef = ref<FormInstance>();
const uploadRef = ref<UploadInstance>();
const submitting = ref(false);
const approvedApplications = ref<any[]>([]);
const selectedApplication = ref<any>(null);
const selectedFile = ref<File | null>(null);

const form = reactive({
  applicationId: undefined as number | undefined,
  awardLevel: '',
  certificateNo: '',
});

const rules: FormRules = {
  applicationId: [{ required: true, message: '请选择申报', trigger: 'change' }],
  awardLevel: [{ required: true, message: '请选择获奖等级', trigger: 'change' }],
  certificateNo: [{ required: true, message: '请输入证书编号', trigger: 'blur' }],
};

const fetchApprovedApplications = async () => {
  try {
    const res = await getMyApplications({ status: 'APPROVED', pageSize: 100 });
    // 过滤掉已有获奖记录的申报
    approvedApplications.value = (res.data || []).filter((app: any) => !app.award);
    
    // 如果URL带有applicationId，预选
    const applicationId = route.query.applicationId;
    if (applicationId) {
      form.applicationId = parseInt(applicationId as string);
      handleApplicationChange(form.applicationId);
    }
  } catch (error) {
    console.error(error);
  }
};

const handleApplicationChange = (id: number) => {
  selectedApplication.value = approvedApplications.value.find(a => a.id === id) || null;
};

const getLevelType = (level?: string): "success" | "info" | "warning" | "danger" | "" => {
  if (!level) return 'info';
  const map: Record<string, string> = { 'A': 'danger', 'B': 'warning', 'C': 'success', 'D': 'info', 'E': 'info' };
  return map[level] || 'info';
};

const handleFileChange = (file: UploadFile) => {
  if (file.raw) {
    selectedFile.value = file.raw;
  }
};

const handleExceed = () => {
  ElMessage.warning('只能上传一个文件');
};

const clearFile = () => {
  selectedFile.value = null;
  uploadRef.value?.clearFiles();
};

const handleSubmit = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    if (!selectedFile.value) {
      ElMessage.warning('请上传总结PDF文件');
      return;
    }

    submitting.value = true;
    try {
      const formData = new FormData();
      formData.append('applicationId', String(form.applicationId));
      formData.append('awardLevel', form.awardLevel);
      formData.append('certificateNo', form.certificateNo);
      formData.append('summaryPdf', selectedFile.value);

      await createAward(formData);
      ElMessage.success('获奖记录已提交，等待审核');
      router.push('/awards');
    } finally {
      submitting.value = false;
    }
  });
};

onMounted(() => {
  fetchApprovedApplications();
});
</script>

<style lang="scss" scoped>
.application-info {
  margin-bottom: 20px;
  margin-left: 120px;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;

  .el-icon {
    color: #409eff;
  }

  span {
    flex: 1;
  }
}
</style>
