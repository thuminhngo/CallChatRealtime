import { AuthProvider, useAuth } from "../context/AuthContext";
import { SocketProvider } from "../context/SocketContext";
import { CallProvider } from "../context/CallContext";
import CallPage from "./CallPage";
import { LoaderIcon } from "lucide-react";

/**
 * Component nội dung bên trong, nơi thực hiện kiểm tra xác thực
 */
function CallPageContent() {
  const { authUser, isCheckingAuth } = useAuth(); // Sử dụng trạng thái từ AuthContext

  // 1. Hiển thị loader trong khi đang xác thực lại session
  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-gray-900 text-white">
        <LoaderIcon className="w-10 h-10 animate-spin text-pink-500 mb-4" />
        <p className="text-lg font-medium animate-pulse">Đang kết nối hệ thống...</p>
      </div>
    );
  }

  // 2. Kiểm tra nếu không có người dùng (session hết hạn hoặc chưa đăng nhập)
  if (!authUser) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-gray-900">
        <div className="text-center text-white p-8 bg-gray-800 rounded-3xl border border-white/10 shadow-2xl">
          <p className="text-xl font-bold mb-2">Phiên làm việc hết hạn</p>
          <p className="text-gray-400">Vui lòng đóng cửa sổ này và thử lại từ tab chính.</p>
          <button 
            onClick={() => window.close()} 
            className="mt-6 px-6 py-2 bg-pink-500 hover:bg-pink-600 rounded-xl transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    );
  }

  // 3. Khi đã xác thực, cung cấp Socket và Call logic cho CallPage
  return (
    <SocketProvider>
      <CallProvider>
        <CallPage />
      </CallProvider>
    </SocketProvider>
  );
}

/**
 * Component Wrapper chính: Phải bao bọc AuthProvider đầu tiên 
 * để SocketProvider có thể lấy được authUser._id cho việc kết nối
 */
export default function CallPageWrapper() {
  return (
    <AuthProvider>
      <CallPageContent />
    </AuthProvider>
  );
}