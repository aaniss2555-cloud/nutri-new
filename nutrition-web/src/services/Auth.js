import api from "./axiosInstance";
import axios from "axios";

// بدلاً من رابط كامل، اجعل المسار نسبي أو أرسل الطلب عبر الـ api مباشرة
// إذا كنت تحتاج فقط المسار الأساسي كـ string:
const AUTH_BASE =
  window.location.hostname === "localhost"
    ? "http://localhost:8000/api/accounts/"
    : "https://nutri-new.onrender.com/api/accounts/";

export const register = async (payload) => {
  return axios.post(`${AUTH_BASE}register/`, payload);
};

export const signup = register;

export const login = async (email, password) => {
  const response = await axios.post(`${AUTH_BASE}login/`, { email, password });
  localStorage.setItem("access", response.data.access);
  localStorage.setItem("refresh", response.data.refresh);
  return response;
};

export const logout = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("userRole");
};

export const getProfile = async () => {
  return api.get("me/");
};

export const requestPasswordReset = async (email) => {
  return axios.post(`${AUTH_BASE}password-reset/`, { email });
};

export const confirmPasswordReset = async (uid, token, password) => {
  return axios.post(`${AUTH_BASE}password-reset-confirm/`, {
    uid,
    token,
    password,
  });
};
