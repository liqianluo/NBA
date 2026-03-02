import axios from 'axios';
import { message } from 'antd';

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
});

request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const msg = error.response?.data?.message || error.message || '请求失败';
    message.error(msg);
    return Promise.reject(error);
  }
);

export default request;
