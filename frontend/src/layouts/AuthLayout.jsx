import React from 'react';
import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <div className="min-h-screen relative bg-gray-100 flex items-center justify-center p-4 overflow-hidden">
      
      {/*background*/}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat blur-[9px] scale-105"
        style={{ backgroundImage: "url('/sample.png')" }} 
      />
      
      {/* Lớp phủ màu đen nhẹ*/}
      <div className="absolute inset-0 z-0 bg-black/10" />

      {/*nội dung*/}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-2rem)]">
        <Outlet />
      </div>

    </div>
  );
}

export default AuthLayout;