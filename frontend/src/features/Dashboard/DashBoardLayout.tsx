import { Outlet } from "react-router-dom";

import Sidebar from "../../components/Sidebar/Sidebar";

const DashboardLayout = () => {
  return (
    <div className="flex h-screen w-full bg-primary-background text-white overflow-hidden">
      <Sidebar />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0A0A0A]">
        {/* Same inset as CoursePage: max width + horizontal padding so scrollbar aligns with course view */}
        <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col overflow-y-auto px-4 pb-10 pt-6 sm:px-6 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
