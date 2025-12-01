import { Outlet } from "react-router-dom";

import Sidebar from "../../components/Sidebar/Sidebar";

const DashboardLayout = () => {
  return (
    <div className="flex h-screen w-full bg-[#0A0A0A] text-white overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-10">
        <div className="w-full max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
