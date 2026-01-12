import { Outlet, NavLink } from "react-router-dom";
import { User, Lock } from "lucide-react";
import SettingsSidebar from "./SettingsSidebar";

export default function SettingsDashboard() {
  // Menu items cho mobile nav
  const menuItems = [
    { path: "profile", label: "Profile", icon: User },
    { path: "password", label: "Password", icon: Lock },
  ];

  return (
    <div className="flex h-full w-full bg-[#FAFAFA] overflow-hidden relative">
      
      {/* LEFT SIDEBAR: chỉ hiển thị trên desktop */}
      <div className="w-64 h-full bg-white border-r border-gray-100 hidden md:block">
        <SettingsSidebar />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 h-full min-w-0 flex flex-col relative">
        <div className ="block md:hidden m-4">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your account</p>
       </div>
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

        {/* Nội dung chính */}
        <div className="flex-1 overflow-hidden p-4 md:p-6 relative">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
