import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { SocketProvider } from "../context/SocketContext";
import { FriendProvider } from "../context/FriendContext";
import { ChatProvider } from "../context/ChatContext";
import { CallProvider } from "../context/CallContext"; 
import { LoaderIcon } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import NavigationSidebar from "../components/NavigationSidebar";
import IncomingCallModal from "../components/IncomingCallModal"; // Khôi phục Modal nhận cuộc gọi
import { GroupProvider } from "../context/GroupContext";

// Component nội dung chính
const ChatPageContent = () => {
  return (
    <div className="h-screen w-full bg-[#F2F0E9] flex flex-col md:flex-row p-0 md:p-2 gap-0 md:gap-1 overflow-hidden">
      {/* Navigation: Hiện ở dưới cùng trên mobile, bên trái trên desktop */}
      <div className="order-2 md:order-1 w-full md:w-auto shrink-0">
        <NavigationSidebar />
      </div>

      {/* Vùng nội dung chính: Hiển thị các Route con như /chat/home, /chat/messages... */}
      <div className="flex-1 h-full min-w-0 bg-white md:rounded-3xl shadow-xl overflow-hidden relative order-1 md:order-2">
        <Outlet /> 
      </div>
      
      {/* Modal này phải nằm trong ChatPage để luôn lắng nghe sự kiện incomingCall */}
      <IncomingCallModal />
    </div>
  );
};

export default function ChatPage() {
  const { authUser, isCheckingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCheckingAuth && !authUser) {
      navigate("/login", { replace: true });
    }
  }, [authUser, isCheckingAuth, navigate]);

  if (isCheckingAuth || !authUser) {
    return (
      <div className="h-screen flex justify-center items-center">
        <LoaderIcon className="animate-spin text-pink-500" />
      </div>
    );
  }

  // Sắp xếp các Provider theo thứ tự phụ thuộc
  return (
    <SocketProvider>
      <FriendProvider>
          <ChatProvider>
            <GroupProvider>
              <CallProvider>
                <ChatPageContent />
              </CallProvider>
              </GroupProvider>
          </ChatProvider>
      </FriendProvider>
    </SocketProvider>
  );
}