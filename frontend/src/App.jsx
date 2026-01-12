import { Routes, Route, Navigate } from "react-router-dom";
import { LoaderIcon } from "lucide-react"; // Import icon loading
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ChatPage from "./pages/ChatPage";
import ForgotPasswordPage from "./pages/ForgetPasswordPage";
import HomeDashboard from "./components/home/HomeDashboard";
import CallsDashboard from "./components/call/CallsDashboard"; 
import FriendsDashboard from "./components/friend/FriendsDashboard";
import ChatDashboard from "./components/chat/ChatDashboard";
import SettingsDashboard from "./components/setting/SettingsDashboard";
import { useAuth } from "./context/AuthContext";
import AuthLayout from './layouts/AuthLayout';
import FriendsList from "./components/friend/FriendsList";
import SentRequests from "./components/friend/SentRequests";
import ProfileSettings from "./components/setting/ProfileSettings";
import ChangePassword from "./components/setting/ChangePassword";
import CallPageWrapper from "./pages/CallPageWrapper";
function App() {
  const { authUser, isCheckingAuth } = useAuth();

  // Chặn render router khi đang kiểm tra đăng nhập
  if (isCheckingAuth && !authUser) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-[#F2F0E9]">
        <LoaderIcon className="w-10 h-10 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/chat" />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/chat" />} />
          <Route path="/forgot-password" element={!authUser ? <ForgotPasswordPage /> : <Navigate to="/chat" />} />
        </Route>

        <Route path="/call" element={<CallPageWrapper />} />

        <Route path="/chat" element={authUser ? <ChatPage /> : <Navigate to="/login" />} >
          {/* Mặc định vào /chat sẽ chuyển hướng sang /chat/home */}
          <Route index element={<Navigate to="home" replace />} />

          {/* Các Route con */}
          <Route path="home" element={<HomeDashboard />} />
          <Route path="messages" element={<ChatDashboard />} />
          <Route path="friends" element={<FriendsDashboard />}>
            <Route index element={<Navigate to="all" replace />} />
            <Route path="all" element={<FriendsList type="all" />} />
            <Route path="online" element={<FriendsList type="online" />} />
            <Route path="requests" element={<FriendsList type="requests" />} />
            <Route path="sent" element={<SentRequests />} />
          </Route>

          {/* Xoá /chat/calls */}
          <Route path="calls" element={<CallsDashboard />} />

          {/* Nested Route cho Settings */}
          <Route path="settings" element={<SettingsDashboard />}>
            {/* Mặc định vào settings sẽ chuyển ngay tới profile */}
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="password" element={<ChangePassword />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

export default App;
