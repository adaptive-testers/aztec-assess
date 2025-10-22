import { FaBook } from "react-icons/fa";
import { IoIosArrowUp } from "react-icons/io";
import { IoMdPerson } from "react-icons/io";
import { IoMdSettings } from "react-icons/io";
import { IoHome } from "react-icons/io5";
import { IoLogOut } from "react-icons/io5";
import { NavLink } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

export default function Sidebar() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="absolute left-0 top-0 flex h-[985px] w-[280px] flex-col items-start bg-[#0F0F0F] border-r border-[#404040] shadow-[0_3px_3px_rgba(0,0,0,0.25)]">
      {/* Header */}
      <div className="flex h-[70px] w-[280px] items-center justify-between px-[17px] border-b border-[#404040]">
        <h2 className="font-geist text-[17px] font-medium leading-[26px] tracking-[0px] text-slate-100">
          Aztec Assess
        </h2>
        <button className="flex h-[35px] w-[39px] items-center justify-center rounded-[7px]">
          <IoIosArrowUp className="h-[17px] w-[17px] rotate-270 text-[rgba(241,245,249,0.7)]" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex h-[878px] w-[278px] flex-col items-start gap-[9px] px-[17px] pt-[17px]">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `group relative flex items-center h-[39px] w-[243px] rounded-[7px] transition-colors duration-200 ${
              isActive ? "bg-[#F87171]" : "hover:bg-[#F87171]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IoHome
                className={`ml-[13px] h-[17px] w-[17px] transition-colors duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-[rgba(241,245,249,0.7)] group-hover:text-white"
                }`}
              />
              <span
                className={`ml-[25px] font-geist text-[15px] font-medium leading-[22px] tracking-[0px] transition-colors duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-[rgba(241,245,249,0.7)] group-hover:text-white"
                }`}
              >
                Dashboard
              </span>
            </>
          )}
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `group relative flex items-center h-[39px] w-[243px] rounded-[7px] transition-colors duration-200 ${
              isActive ? "bg-[#F87171]" : "hover:bg-[#F87171]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IoMdPerson
                className={`ml-[13px] h-[17px] w-[17px] transition-colors duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-[rgba(241,245,249,0.7)] group-hover:text-white"
                }`}
              />
              <span
                className={`ml-[25px] font-geist text-[15px] font-medium leading-[22px] tracking-[0px] transition-colors duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-[rgba(241,245,249,0.7)] group-hover:text-white"
                }`}
              >
                Profile
              </span>
            </>
          )}
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `group relative flex items-center h-[39px] w-[243px] rounded-[7px] transition-colors duration-200 ${
              isActive ? "bg-[#F87171]" : "hover:bg-[#F87171]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IoMdSettings
                className={`ml-[13px] h-[17px] w-[17px] transition-colors duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-[rgba(241,245,249,0.7)] group-hover:text-white"
                }`}
              />
              <span
                className={`ml-[25px] font-geist text-[15px] font-medium leading-[22px] tracking-[0px] transition-colors duration-200 ${
                  isActive
                    ? "text-white"
                    : "text-[rgba(241,245,249,0.7)] group-hover:text-white"
                }`}
              >
                Settings
              </span>
            </>
          )}
        </NavLink>

        {/* Courses */}
        <NavLink
          className={({ isActive }) =>
            `group relative h-[39px] w-[243px] rounded-[7px] transition-colors duration-200 ${
              isActive ? "bg-[#F87171]" : "hover:bg-[#F87171]"
            }`
          }
          to="/courses"
        >
          <FaBook className="absolute left-[13px] top-[11px] h-[17px] w-[17px] text-[rgba(241,245,249,0.7)]" />
          <span className="absolute left-[52px] top-[9px] font-geist text-[15px] font-medium leading-[22px] tracking-[0px] text-[rgba(241,245,249,0.7)]">
            Courses
          </span>
          <IoIosArrowUp className="absolute left-[213px] top-[11px] h-[17px] w-[17px] rotate-180 text-[rgba(241,245,249,0.7)]" />
        </NavLink>
      </nav>

      {/* Logout */}
      <div className="flex h-[75px] w-[278px] flex-col items-start border-t-[1px] border-[#404040] px-[17px] pt-[19px]">
        <button
          onClick={handleLogout}
          className="relative h-[39px] w-[243px] rounded-[7px] hover:bg-[#F87171] duration-200"
          type="button"
        >
          <IoLogOut className="absolute left-[13px] top-[11px] h-[17px] w-[17px] text-[rgba(241,245,249,0.7)]" />
          <span className="absolute left-[52px] top-[9px] text-[15px] font-medium leading-[22px] tracking-[0px] text-[rgba(241,245,249,0.7)]">
            Logout
          </span>
        </button>
      </div>
    </div>
  );
}
