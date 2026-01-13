import { get, post, put, del } from './request';

export interface Student {
  id: number;
  studentId: string;
  name: string;
  departmentId?: number;
  department?: any;
  major?: string;
  contact?: string;
  createdAt: string;
}

export interface StudentQuery {
  page?: number;
  pageSize?: number;
  departmentId?: number;
  major?: string;
}

// 搜索学生
export const searchStudents = (keyword: string) => {
  return get<{ data: Student[] }>('/students/search', { params: { keyword } });
};

// 获取学生列表
export const getStudents = (params?: StudentQuery) => {
  return get<{ data: Student[]; pagination: any }>('/students', { params });
};

// 获取单个学生
export const getStudent = (id: number) => {
  return get<{ data: Student }>(`/students/${id}`);
};

// 创建学生
export const createStudent = (data: Partial<Student>) => {
  return post<{ data: Student }>('/students', data);
};

// 更新学生
export const updateStudent = (id: number, data: Partial<Student>) => {
  return put<{ data: Student }>(`/students/${id}`, data);
};

// 删除学生
export const deleteStudent = (id: number) => {
  return del(`/students/${id}`);
};

// 同步学生信息
export const syncStudent = (studentId: string) => {
  return post<{ data: Student }>('/students/sync', { studentId });
};

// 获取历史参赛学生
export const getMyHistoryStudents = () => {
  return get<{ data: (Student & { applicationCount: number })[] }>('/students/my-history');
};

// 批量同步学生
export const batchSyncStudents = (studentIds: number[]) => {
  return post<{ data: Student[] }>('/students/batch-sync', { studentIds });
};
