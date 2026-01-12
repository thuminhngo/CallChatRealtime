import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { LoaderIcon } from "lucide-react";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  // ===== 1️⃣ Kiểm tra đăng nhập khi load trang =====
  const checkAuth = useCallback(async () => {
    setIsCheckingAuth(true);
    try {
      const res = await axiosInstance.get("/auth/check"); // backend trả { success, user }
      setAuthUser(res.data.user || null);
    } catch (error) {
      console.log("Error in checkAuth:", error);
      setAuthUser(null);
    } finally {
      setIsCheckingAuth(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ===== 2️⃣ Signup =====
  const signup = async (data) => {
    setIsSigningUp(true);
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      setAuthUser(res.data.user);
      toast.success("Account created successfully!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Signup failed");
      throw error;
    } finally {
      setIsSigningUp(false);
    }
  };

  // ===== 3️⃣ Login =====
  const login = async (data) => {
    setIsLoggingIn(true);
    try {
      const res = await axiosInstance.post("/auth/login", data);
      setAuthUser(res.data.user);
      toast.success("Logged in successfully!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Login failed");
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  // ===== 4️⃣ Logout =====
  const logout = async () => {
    try {
      await axiosInstance.get("/auth/logout");
      setAuthUser(null);
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Logout failed");
    }
  };

  // ===== 5️⃣ Cập nhật profile=====
  const updateProfile = async (data) => {
    setIsUpdatingProfile(true);
    try {
      // Gọi đến endpoint mới (xem phần sửa Backend bên dưới)
      const res = await axiosInstance.put("/auth/update-profile", data);
      setAuthUser(res.data.user);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const forgotPassword = async (email) => {
    setIsSendingOTP(true);
    try {
      // Gọi API /auth/forgot-password (cần khớp với route backend của bạn)
      const res = await axiosInstance.post("/auth/forgot-password", { email });
      toast.success(res.data.message || "OTP sent to your email!");
      return true; // Trả về true để component biết chuyển bước
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send OTP");
      return false;
    } finally {
      setIsSendingOTP(false);
    }
  };

  // ===== 7️⃣ (MỚI) Reset Password - Xác nhận OTP & Đổi pass =====
  const resetPassword = async (data) => {
    // data bao gồm: { email, otp, newPassword }
    setIsResettingPassword(true);
    try {
      const res = await axiosInstance.post("/auth/reset-password", data);
      toast.success(res.data.message || "Password reset successfully!");
      return true;
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reset password");
      return false;
    } finally {
      setIsResettingPassword(false);
    }
  };

  
  // ===== 6️⃣ Loader khi đang checkAuth =====
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[#F2F0E9]">
        <LoaderIcon className="w-10 h-10 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        authUser,
        isSigningUp,
        isLoggingIn,
        isUpdatingProfile,
        isCheckingAuth,
        signup,
        login,
        logout,
        updateProfile,
        setAuthUser,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
