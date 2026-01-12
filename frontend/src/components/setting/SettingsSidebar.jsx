import { User, Lock } from "lucide-react";
import { NavLink } from "react-router-dom";

export default function SettingsSidebar() {
  const menuItems = [
    { path: "profile", label: "Profile", icon: User },
    { path: "password", label: "Password", icon: Lock },
  ];

  return (
    <div className="flex md:flex-col h-auto md:h-full py-3 md:py-6 px-4 md:px-6 bg-white overflow-x-auto md:overflow-y-auto">
      <div className="hidden md:block mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your account</p>
      </div>

      {/* Navigation Menu: Hàng ngang trên mobile, hàng dọc trên desktop */}
      <nav className="flex md:flex-col gap-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex items-center gap-3 px-4 py-2.5 md:py-3 rounded-xl transition-all font-medium text-sm whitespace-nowrap
              ${isActive 
                ? "bg-pink-50 text-pink-600 shadow-sm" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }
            `}
          >
            <item.icon size={18} strokeWidth={2} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}