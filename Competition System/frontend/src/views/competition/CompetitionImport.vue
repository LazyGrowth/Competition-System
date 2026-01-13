<template>
  <div class="page-container">
    <div class="page-header">
      <h1>竞赛导入</h1>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="文件导入" name="file">
        <div class="import-section">
          <el-alert
            title="导入说明"
            type="info"
            :closable="false"
            style="margin-bottom: 20px"
          >
            <template #default>
              <p>请上传Excel或CSV文件，文件应包含以下字段：</p>
              <ul>
                <li>牵头院系、年份、届数、赛名、赛道、区域（国赛/省赛/校赛）、等级（A/B/C/D/E）、排名（仅AB类需填写）</li>
              </ul>
              <p style="color: #e6a23c; margin-top: 8px;">注意：院级管理员只能导入C/D/E类竞赛，A/B类需校级管理员导入</p>
              <el-button type="primary" link @click="downloadTemplate" style="margin-top: 8px;">
                <el-icon><Download /></el-icon> 下载导入模板
              </el-button>
            </template>
          </el-alert>

          <el-upload
            ref="uploadRef"
            class="upload-area"
            drag
            :auto-upload="false"
            :limit="1"
            accept=".xlsx,.xls,.csv"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
          >
            <el-icon class="el-icon--upload" :size="48"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 .xlsx, .xls, .csv 格式，文件大小不超过10MB
              </div>
            </template>
          </el-upload>

          <div v-if="selectedFile" class="selected-file">
            <el-icon><Document /></el-icon>
            <span>{{ selectedFile.name }}</span>
            <el-button text type="danger" @click="clearFile">移除</el-button>
          </div>

          <div class="import-actions">
            <el-button
              type="primary"
              :loading="previewing"
              :disabled="!selectedFile"
              @click="handlePreview"
            >
              预览数据
            </el-button>
            <el-button
              type="success"
              :loading="importing"
              :disabled="!selectedFile"
              @click="handleDirectImport"
            >
              直接导入
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="手动录入" name="manual">
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
          style="max-width: 600px"
        >
          <el-form-item label="竞赛名称" prop="name">
            <el-input v-model="form.name" placeholder="请输入竞赛名称" />
          </el-form-item>
          <el-form-item label="赛道" prop="track">
            <el-input v-model="form.track" placeholder="请输入赛道，如：本科组" />
          </el-form-item>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="竞赛等级" prop="level">
                <el-select v-model="form.level" style="width: 100%">
                  <el-option label="A级（国家级官方赛事）" value="A" :disabled="!userStore.isSchoolAdmin" />
                  <el-option label="B级（省级官方赛事）" value="B" :disabled="!userStore.isSchoolAdmin" />
                  <el-option label="C级（省级/地市级赛事）" value="C" />
                  <el-option label="D级（其他校外赛事）" value="D" />
                  <el-option label="E级（校内赛事）" value="E" />
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
          <el-form-item v-if="['A', 'B'].includes(form.level)" label="榜单排名" prop="ranking">
            <el-input-number v-model="form.ranking" :min="1" style="width: 100%" placeholder="在教育部榜单中的排名" />
          </el-form-item>
          <el-form-item label="有效期">
            <el-date-picker v-model="form.validUntil" type="date" placeholder="不填则长期有效" style="width: 100%" />
          </el-form-item>
          <el-form-item label="是否需经费">
            <el-switch v-model="form.requiresFunding" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="saving" @click="handleManualSave">保存</el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <!-- 预览对话框 -->
    <el-dialog v-model="showPreview" title="数据预览" width="90%" top="5vh">
      <el-alert v-if="previewData.duplicateCount > 0" type="info" :closable="false" style="margin-bottom: 15px">
        <template #title>
          检测到 {{ previewData.duplicateCount }} 条重复记录（已自动过滤）
        </template>
        <p style="margin: 5px 0 0;">文件共 {{ previewData.total }} 条记录，其中 {{ previewData.data.length }} 条为新数据，{{ previewData.duplicateCount }} 条已存在于数据库中。</p>
      </el-alert>
      <el-alert v-if="previewData.errors.length > 0" type="warning" :closable="false" style="margin-bottom: 15px">
        <template #title>
          发现 {{ previewData.errors.length }} 条提示信息
        </template>
        <ul style="margin: 10px 0 0; padding-left: 20px;">
          <li v-for="(err, idx) in previewData.errors.slice(0, 5)" :key="idx">{{ err }}</li>
          <li v-if="previewData.errors.length > 5">... 等共 {{ previewData.errors.length }} 条</li>
        </ul>
      </el-alert>
      
      <el-table :data="previewData.data" max-height="400" stripe border>
        <el-table-column prop="name" label="竞赛名称" min-width="200" />
        <el-table-column prop="level" label="等级" width="70" />
        <el-table-column prop="region" label="区域" width="90">
          <template #default="{ row }">
            {{ { NATIONAL: '国赛', PROVINCIAL: '省赛', SCHOOL: '校赛' }[row.region] || row.region }}
          </template>
        </el-table-column>
        <el-table-column prop="year" label="年份" width="80" />
        <el-table-column prop="session" label="届数" width="100" />
        <el-table-column prop="track" label="赛道" width="100" />
        <el-table-column prop="ranking" label="排名" width="70" />
        <el-table-column prop="requiresFunding" label="需经费" width="80">
          <template #default="{ row }">
            <el-tag :type="row.requiresFunding ? 'success' : 'info'" size="small">
              {{ row.requiresFunding ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="validUntil" label="有效期" width="110">
          <template #default="{ row }">
            {{ row.validUntil ? new Date(row.validUntil).toLocaleDateString() : '长期' }}
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showPreview = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleConfirmImport"
            :loading="importing"
            :disabled="previewData.data.length === 0"
          >
            确认导入 ({{ previewData.data.length }} 条)
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 导入结果 -->
    <el-dialog v-model="showResult" title="导入结果" width="500px">
      <el-result
        :icon="importResult.success ? 'success' : 'warning'"
        :title="importResult.success ? '导入成功' : '导入完成（部分失败）'"
      >
        <template #sub-title>
          <p>成功导入 {{ importResult.imported }} 条数据，共 {{ importResult.total }} 条</p>
        </template>
        <template #extra>
          <el-button type="primary" @click="showResult = false">确定</el-button>
        </template>
      </el-result>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { ElMessage, FormInstance, FormRules, UploadInstance, UploadFile } from 'element-plus';
import { useUserStore } from '@/stores/user';
import { importCompetitions, previewImportCompetitions, confirmImportCompetitions, createCompetition } from '@/api/competition';

const userStore = useUserStore();

const activeTab = ref('file');
const uploadRef = ref<UploadInstance>();
const formRef = ref<FormInstance>();

const selectedFile = ref<File | null>(null);
const importing = ref(false);
const previewing = ref(false);
const saving = ref(false);
const showResult = ref(false);
const showPreview = ref(false);
const importResult = reactive({
  success: false,
  imported: 0,
  total: 0,
});
const previewData = reactive({
  data: [] as any[],
  errors: [] as string[],
  duplicateCount: 0,
  total: 0,
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

// 预览数据
const handlePreview = async () => {
  if (!selectedFile.value) return;

  previewing.value = true;
  try {
    const res: any = await previewImportCompetitions(selectedFile.value);
    // 响应拦截器已返回 response.data，所以 res.data 就是实际数据
    previewData.data = res.data?.data || [];
    previewData.errors = res.data?.errors || [];
    previewData.duplicateCount = res.data?.duplicateCount || 0;
    previewData.total = res.data?.total || 0;
    showPreview.value = true;
  } catch (error: any) {
    // 如果有验证错误
    if (error.response?.data?.data) {
      previewData.errors = error.response.data.data;
      previewData.data = [];
      previewData.duplicateCount = 0;
      previewData.total = 0;
      showPreview.value = true;
    }
  } finally {
    previewing.value = false;
  }
};

// 确认导入
const handleConfirmImport = async () => {
  if (previewData.data.length === 0) return;

  importing.value = true;
  try {
    const res = await confirmImportCompetitions(previewData.data);
    importResult.success = res.data.imported === res.data.total;
    importResult.imported = res.data.imported;
    importResult.total = res.data.total;
    showPreview.value = false;
    showResult.value = true;
    clearFile();
    previewData.data = [];
    previewData.errors = [];
    previewData.duplicateCount = 0;
    previewData.total = 0;
  } catch (error) {
    // 错误已在拦截器中处理
  } finally {
    importing.value = false;
  }
};

// 直接导入（不预览）
const handleDirectImport = async () => {
  if (!selectedFile.value) return;

  importing.value = true;
  try {
    const res = await importCompetitions(selectedFile.value);
    importResult.success = res.data.data?.imported === res.data.data?.total;
    importResult.imported = res.data.data?.imported || 0;
    importResult.total = res.data.data?.total || 0;
    showResult.value = true;
    clearFile();
  } catch (error) {
    // 错误已在拦截器中处理
  } finally {
    importing.value = false;
  }
};

const handleManualSave = async () => {
  if (!formRef.value) return;

  await formRef.value.validate(async (valid) => {
    if (!valid) return;

    saving.value = true;
    try {
      await createCompetition(form);
      ElMessage.success('竞赛创建成功');
      resetForm();
    } catch (error) {
      // 错误已在拦截器中处理
    } finally {
      saving.value = false;
    }
  });
};

const resetForm = () => {
  formRef.value?.resetFields();
  form.ranking = undefined;
  form.validUntil = undefined;
  form.requiresFunding = false;
};

const downloadTemplate = () => {
  // 创建模板数据 - 使用制表符分隔，这样Excel打开时列宽更合适
  const headers = ['牵头院系', '年份', '届数', '赛名', '赛道', '区域', '等级', '排名', '是否需经费', '有效期'];
  const exampleData = [
    ['计算机科学与技术学院', '2026', '第18届', '全国大学生电子设计竞赛', '本科组', '国赛', 'A', '13', '是', '2028/12/31'],
    ['数学与统计学院', '2026', '第35届', '全国大学生数学建模竞赛', '本科组', '国赛', 'A', '5', '是', ''],
    ['商学院', '2026', '第12届', '省大学生程序设计竞赛', '本科组', '省赛', 'C', '', '否', ''],
    ['计算机科学与技术学院', '2026', '第10届', '校程序设计新生赛', '新生组', '校赛', 'E', '', '否', '2027/06/30'],
  ];
  
  // 生成TSV内容（制表符分隔，Excel识别更好）
  const tsvContent = [
    headers.join('\t'),
    ...exampleData.map(row => row.join('\t'))
  ].join('\n');
  
  // 添加BOM以支持中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
  
  // 下载文件
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '竞赛导入模板.xls';
  link.click();
  window.URL.revokeObjectURL(url);
  
  ElMessage.success('模板下载成功，请用Excel或WPS打开');
};
</script>

<style lang="scss" scoped>
.import-section {
  max-width: 600px;

  .upload-area {
    width: 100%;

    :deep(.el-upload-dragger) {
      width: 100%;
    }
  }

  .selected-file {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #f5f7fa;
    border-radius: 8px;
    margin-top: 16px;

    .el-icon {
      color: #409eff;
    }

    span {
      flex: 1;
    }
  }

  .import-actions {
    display: flex;
    gap: 12px;
    margin-top: 20px;
  }
}
</style>
