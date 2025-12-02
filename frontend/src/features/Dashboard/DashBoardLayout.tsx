import { Outlet } from "react-router-dom";

import Sidebar from "../../components/Sidebar/Sidebar";

const DashboardLayout = () => {
  return (
    <div className="flex h-screen w-full bg-primary-background text-white overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-7">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
