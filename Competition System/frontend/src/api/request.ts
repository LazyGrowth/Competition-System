import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';
import router from '@/router';

// 防止401处理时无限循环的标志
let isLoggingOut = false;

// 创建axios实例
const request: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore();
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data;
    
    // 如果是文件下载，直接返回
    if (response.config.responseType === 'blob') {
      return response;
    }

    // 业务成功
    if (res.success) {
      return res;
    }

    // 业务失败
    ElMessage.error(res.message || '请求失败');
    return Promise.reject(new Error(res.message || '请求失败'));
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || '请求失败';

      switch (status) {
        case 401:
          // 防止无限循环：如果已经在登出过程中，直接跳过
          if (!isLoggingOut) {
            isLoggingOut = true;
            ElMessage.error('登录已过期，请重新登录');
            const userStore = useUserStore();
            // 直接清除本地状态，不调用API
            userStore.clearAuth();
            router.push('/login');
            // 重置标志
            setTimeout(() => {
              isLoggingOut = false;
            }, 1000);
          }
          break;
        case 403:
          ElMessage.error('权限不足');
          break;
        case 404:
          ElMessage.error('请求的资源不存在');
          break;
        case 500:
          ElMessage.error('服务器错误');
          break;
        default:
          ElMessage.error(message);
      }
    } else if (error.message.includes('timeout')) {
      ElMessage.error('请求超时，请稍后重试');
    } else {
      ElMessage.error('网络错误，请检查网络连接');
    }

    return Promise.reject(error);
  }
);

// 封装请求方法
export const get = <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return request.get(url, config);
};

export const post = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return request.post(url, data, config);
};

export const put = <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
  return request.put(url, data, config);
};

export const del = <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  return request.delete(url, config);
};

export default request;
