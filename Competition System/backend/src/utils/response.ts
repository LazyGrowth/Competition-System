import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  message: string;
  data?: T;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ErrorResponse {
  success: false;
  message: string;
  errors?: any[];
}

// 成功响应
export const successResponse = <T>(
  res: Response,
  data?: T,
  message: string = '操作成功',
  statusCode: number = 200
) => {
  const response: SuccessResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

// 分页响应
export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  page: number,
  pageSize: number,
  total: number,
  message: string = '查询成功'
) => {
  const totalPages = Math.ceil(total / pageSize);
  const response: SuccessResponse<T[]> = {
    success: true,
    message,
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
  return res.status(200).json(response);
};

// 创建成功响应
export const createdResponse = <T>(res: Response, data?: T, message: string = '创建成功') => {
  return successResponse(res, data, message, 201);
};

// 删除成功响应
export const deletedResponse = (res: Response, message: string = '删除成功') => {
  return successResponse(res, null, message, 200);
};

// 错误响应
export const errorResponse = (
  res: Response,
  message: string = '操作失败',
  statusCode: number = 400,
  errors?: any[]
) => {
  const response: ErrorResponse = {
    success: false,
    message,
    errors,
  };
  return res.status(statusCode).json(response);
};
