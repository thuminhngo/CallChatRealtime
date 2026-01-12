import { useState } from "react";
import { Outlet, useLocation, useNavigate, NavLink } from "react-router-dom"; 
import { useChat } from "../../context/ChatContext";
import { Users, UserCheck, Clock, SendToBack } from "lucide-react"; 

import FriendsSidebar from "./FriendsSidebar";
import RightSidebar from "./RightSidebar";
import FriendsHeader from "./FriendsHeader";
import AddFriendButton from "./AddFriendButton"; 

export default function FriendsDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelectedUser } = useChat();

  // State giao diện chung
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Menu items cho mobile nav
  const menuItems = [
    { path: "all", label: "All Friends", icon: Users },         
    { path: "online", label: "Online", icon: UserCheck },
    { path: "requests", label: "Requests", icon: Clock },
    { path: "sent", label: "Sent Requests", icon: SendToBack },
  ];

  const handleStartChat = (friend) => {
    setSelectedUser(friend);
    navigate("/chat/messages");
  };

  // Xác định tiêu đề dựa trên URL
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("online")) return "Online Friends";
    if (path.includes("requests")) return "Friend Requests";
    if (path.includes("sent")) return "Sent Requests";
    return "All Friends";
  };

  return (
    <div className="flex h-full w-full bg-[#FAFAFA] overflow-hidden relative">

      {/* LEFT SIDEBAR: luôn hiển thị */}
      <div className="w-64 h-full bg-white border-r border-gray-100 hidden md:block">
        <FriendsSidebar />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 h-full min-w-0 flex flex-col relative">
        <FriendsHeader
          title={getPageTitle()}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showSearch={true}
          showToggle={true}
        />

        {/* MOBILE NAV: hiển thị ngang */}
        <div className="md:hidden flex overflow-x-auto bg-white border-b border-gray-100 px-4 py-2 gap-2 no-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-2 px-4 py-2 rounded-full transition-colors font-medium text-xs whitespace-nowrap
                ${isActive ? "bg-pink-500 text-white shadow-sm" : "bg-gray-100 text-gray-500"}
              `}
            >
              <item.icon size={14} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="flex-1 overflow-hidden p-4 md:p-6 relative flex flex-col">
          <Outlet context={{ searchQuery, viewMode, onStartChat: handleStartChat }} />
          <AddFriendButton />
        </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="w-72 h-full flex-shrink-0 hidden xl:block border-l border-gray-100 bg-white">
        <RightSidebar onStartChat={handleStartChat} />
      </div>
    </div>
  );
}
