<template>
  <div class="page-container">
    <div class="page-header">
      <h1>历史数据导入</h1>
      <p class="page-description">
        用于导入历史获奖记录数据，适用于系统上线初期的数据迁移
      </p>
    </div>

    <!-- 管理员配置区域 -->
    <el-card v-if="userStore.isSchoolAdmin || userStore.isSuperAdmin" class="config-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>导入配置</span>
          <el-tag :type="config.enabled ? 'success' : 'danger'">
            {{ config.enabled ? '已开启' : '已关闭' }}
          </el-tag>
        </div>
      </template>
      
      <el-form :model="config" label-width="120px">
        <el-form-item label="功能开关">
          <el-switch 
            v-model="config.enabled" 
            active-text="开启"
            inactive-text="关闭"
            @change="handleConfigUpdate"
          />
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="config.deadline"
            type="datetime"
            placeholder="选择截止日期"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            @change="handleConfigUpdate"
          />
        </el-form-item>
        <el-form-item>
          <el-text type="info" size="small">
            截止日期后，教师将无法再提交历史数据
          </el-text>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 导入区域 -->
    <el-card class="import-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>数据导入</span>
        </div>
      </template>

      <div v-if="!config.enabled && !configLoading" class="disabled-notice">
        <el-icon size="48"><WarningFilled /></el-icon>
        <p>历史数据导入功能当前已关闭</p>
        <p v-if="userStore.isSchoolAdmin || userStore.isSuperAdmin">
          请在上方配置中开启该功能
        </p>
        <p v-else>请联系管理员开启该功能</p>
      </div>

      <div v-else class="import-area">
        <!-- 状态提示 -->
        <el-alert
          v-if="config.deadline"
          :title="`导入截止日期：${config.deadline}`"
          :type="isDeadlinePassed ? 'error' : 'warning'"
          show-icon
          :closable="false"
          style="margin-bottom: 20px"
        >
          <template v-if="isDeadlinePassed">
            历史数据导入已截止，无法再进行导入操作
          </template>
        </el-alert>

        <!-- 步骤说明 -->
        <div class="import-steps">
          <h3>导入步骤</h3>
          <el-steps :active="currentStep" finish-status="success">
            <el-step title="下载模板" description="下载Excel导入模板" />
            <el-step title="填写数据" description="按模板格式填写历史获奖数据" />
            <el-step title="上传文件" description="上传填写好的Excel文件" />
            <el-step title="确认导入" description="查看导入结果" />
          </el-steps>
        </div>

        <!-- 模板下载 -->
        <div class="template-section">
          <el-button type="primary" @click="handleDownloadTemplate" :loading="downloading">
            <el-icon><Download /></el-icon>
            下载导入模板
          </el-button>
          <span class="template-hint">请先下载模板，按照模板格式填写数据</span>
        </div>

        <!-- 文件上传 -->
        <div class="upload-section" v-if="!isDeadlinePassed">
          <el-upload
            ref="uploadRef"
            drag
            action=""
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :limit="1"
            accept=".xlsx,.xls,.csv"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                仅支持 xlsx、xls、csv 格式文件，大小不超过 10MB
              </div>
            </template>
          </el-upload>

          <el-button 
            type="success" 
            size="large" 
            :disabled="!selectedFile"
            :loading="importing"
            @click="handleImport"
            style="margin-top: 20px"
          >
            <el-icon><Upload /></el-icon>
            开始导入
          </el-button>
        </div>

        <!-- 导入结果 -->
        <div v-if="importResult" class="result-section">
          <el-divider />
          <h3>导入结果</h3>
          <div class="result-summary">
            <el-statistic title="成功导入" :value="importResult.success">
              <template #suffix>条</template>
            </el-statistic>
            <el-statistic title="导入失败" :value="importResult.failed">
              <template #suffix>条</template>
            </el-statistic>
          </div>

          <div v-if="importResult.errors.length > 0" class="error-list">
            <h4>错误详情</h4>
            <el-scrollbar max-height="300px">
              <el-alert
                v-for="(error, index) in importResult.errors"
                :key="index"
                :title="error"
                type="error"
                :closable="false"
                style="margin-bottom: 8px"
              />
            </el-scrollbar>
          </div>
        </div>

        <!-- 字段说明 -->
        <el-collapse style="margin-top: 20px">
          <el-collapse-item title="字段说明" name="1">
            <el-table :data="fieldDescriptions" stripe border>
              <el-table-column prop="field" label="字段名" width="120" />
              <el-table-column prop="required" label="必填" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'" size="small">
                    {{ row.required ? '是' : '否' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="description" label="说明" />
              <el-table-column prop="example" label="示例" width="180" />
            </el-table>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox, UploadInstance, UploadFile } from 'element-plus';
import { Download, Upload, UploadFilled, WarningFilled } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import {
  getHistoryImportConfig,
  updateHistoryImportConfig,
  downloadHistoryTemplate,
  importHistoryData,
  HistoryImportResult,
} from '@/api/system';

const userStore = useUserStore();
const uploadRef = ref<UploadInstance>();

const configLoading = ref(true);
const config = ref({
  enabled: false,
  deadline: null as string | null,
});

const currentStep = ref(0);
const downloading = ref(false);
const importing = ref(false);
const selectedFile = ref<File | null>(null);
const importResult = ref<HistoryImportResult | null>(null);

// 计算是否已过截止时间
const isDeadlinePassed = computed(() => {
  if (!config.value.deadline) return false;
  return new Date() > new Date(config.value.deadline);
});

// 字段说明数据
const fieldDescriptions = [
  { field: '竞赛名称', required: true, description: '竞赛的完整名称，如已存在则关联，不存在则创建', example: '全国大学生数学建模竞赛' },
  { field: '竞赛等级', required: false, description: '竞赛等级：A/B/C/D/E，默认C', example: 'A' },
  { field: '竞赛区域', required: false, description: '竞赛区域：国赛/省赛/校赛，默认校赛', example: '国赛' },
  { field: '教师工号', required: true, description: '指导教师的工号（必须已存在于系统中）', example: 'teacher001' },
  { field: '学生姓名', required: false, description: '参赛学生姓名，多人用逗号分隔', example: '张三,李四,王五' },
  { field: '学生学号', required: false, description: '参赛学生学号，多人用逗号分隔', example: '2020001,2020002,2020003' },
  { field: '获奖等级', required: true, description: '获奖等级：特等奖/一等奖/二等奖/三等奖/优秀奖', example: '一等奖' },
  { field: '获奖时间', required: false, description: '获奖日期，格式：YYYY/MM/DD', example: '2025/06/01' },
  { field: '证书编号', required: false, description: '获奖证书编号，格式如"X-Y"，需唯一', example: '3-1' },
  { field: '获奖总结', required: false, description: '获奖情况简要描述', example: '在本次竞赛中表现优异' },
];

// 获取配置
const fetchConfig = async () => {
  configLoading.value = true;
  try {
    const res = await getHistoryImportConfig();
    config.value = {
      enabled: res.data?.enabled || false,
      deadline: res.data?.deadline || null,
    };
  } catch {
    // 如果获取失败，默认显示关闭状态
    config.value = { enabled: false, deadline: null };
  } finally {
    configLoading.value = false;
  }
};

// 更新配置
const handleConfigUpdate = async () => {
  try {
    await updateHistoryImportConfig(config.value.enabled, config.value.deadline || undefined);
    ElMessage.success('配置更新成功');
  } catch {
    // 恢复原值
    fetchConfig();
  }
};

// 下载模板
const handleDownloadTemplate = async () => {
  downloading.value = true;
  try {
    await downloadHistoryTemplate();
    currentStep.value = Math.max(currentStep.value, 1);
    ElMessage.success('模板下载成功');
  } catch {
    ElMessage.error('模板下载失败');
  } finally {
    downloading.value = false;
  }
};

// 文件选择
const handleFileChange = (file: UploadFile) => {
  selectedFile.value = file.raw || null;
  currentStep.value = Math.max(currentStep.value, 2);
};

// 文件移除
const handleFileRemove = () => {
  selectedFile.value = null;
};

// 开始导入
const handleImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件');
    return;
  }

  try {
    await ElMessageBox.confirm(
      '确定要导入该文件吗？导入后数据将直接写入数据库。',
      '确认导入',
      {
        confirmButtonText: '确定导入',
        cancelButtonText: '取消',
        type: 'warning',
      }
    );
  } catch {
    return;
  }

  importing.value = true;
  try {
    const res = await importHistoryData(selectedFile.value);
    importResult.value = res.data;
    currentStep.value = 3;
    
    if (res.data.failed === 0) {
      ElMessage.success(`导入完成：成功 ${res.data.success} 条`);
    } else {
      ElMessage.warning(`导入完成：成功 ${res.data.success} 条，失败 ${res.data.failed} 条`);
    }

    // 清空文件
    uploadRef.value?.clearFiles();
    selectedFile.value = null;
  } catch {
    ElMessage.error('导入失败');
  } finally {
    importing.value = false;
  }
};

onMounted(() => {
  fetchConfig();
});
</script>

<style lang="scss" scoped>
.page-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;

  h1 {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: #303133;
  }

  .page-description {
    margin: 0;
    color: #909399;
    font-size: 14px;
  }
}

.config-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
}

.import-card {
  .disabled-notice {
    text-align: center;
    padding: 60px 20px;
    color: #909399;

    .el-icon {
      margin-bottom: 16px;
      color: #e6a23c;
    }

    p {
      margin: 8px 0;
      font-size: 14px;
    }
  }
}

.import-area {
  .import-steps {
    margin-bottom: 30px;

    h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }

  .template-section {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;

    .template-hint {
      color: #909399;
      font-size: 14px;
    }
  }

  .upload-section {
    text-align: center;
    padding: 20px;
    background: #fafafa;
    border-radius: 8px;
  }

  .result-section {
    h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    .result-summary {
      display: flex;
      gap: 60px;
      margin-bottom: 20px;
    }

    .error-list {
      h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #909399;
      }
    }
  }
}
</style>
