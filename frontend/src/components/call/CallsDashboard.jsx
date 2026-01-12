import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useChat } from "../../context/ChatContext";
import { useCall } from "../../context/CallContext"; 
// SỬA: Import thêm AuthContext và utils/callHandler
import { useAuth } from "../../context/AuthContext";
import { startCall } from '../../utils/callHandler';
import CallsHeader from "./CallsHeader";
import CallsList from "./CallsList";

export default function CallsDashboard() {
  const navigate = useNavigate();
  const { setSelectedUser } = useChat();
  const { calls, isCallLoading, fetchCallHistory } = useCall();
  // SỬA: Lấy authUser để làm người gọi (Caller)
  const { authUser } = useAuth();

  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCallHistory();
  }, [fetchCallHistory]);

  // Logic lọc cuộc gọi (Filter)
  const filteredCalls = calls.filter(call => {
    // Check null safety cho contact
    const contactName = call.contact?.fullName || "Unknown";
    const contactEmail = call.contact?.email || "";
    
    const matchesSearch = 
      contactName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      contactEmail.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;
    if (filter === "missed") {
      matchesFilter = ["missed", "rejected", "busy", "unavailable"].includes(call.status);
    } else if (filter === "incoming") {
      matchesFilter = call.direction === "incoming" && call.status === "answered";
    } else if (filter === "outgoing") {
      matchesFilter = call.direction === "outgoing" && call.status === "answered";
    }

    return matchesSearch && matchesFilter;
  });

  const handleMessage = (call) => {
    if (!call.contact) return;
    setSelectedUser(call.contact);
    navigate("/chat/messages");
  };

  const openCallWindow = (contact, isVideo) => {
    // SỬA: Dùng hàm startCall thay vì tự viết logic window.open
    // Hàm startCall sẽ tự tạo ID phòng ngắn gọn để tránh lỗi Agora
    if (contact && authUser) {
      startCall(authUser, contact, isVideo);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <CallsHeader
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <div className="flex-1 overflow-y-auto px-4 md:px-6">
        <CallsList
          calls={filteredCalls}
          loading={isCallLoading}
          onMessage={handleMessage}
          onCall={(call) => openCallWindow(call.contact, false)}
          onVideo={(call) => openCallWindow(call.contact, true)}
        />
      </div>
    </div>
  );
}