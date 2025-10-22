import { Outlet } from "react-router-dom";

import Sidebar from "../../components/Sidebar/Sidebar";

const DashboardLayout = () => {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A] text-white">
      <div className="w-[260px] flex-shrink-0">
        <Sidebar />
      </div>
      <main className="flex-1 flex justify-center items-start py-10">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
