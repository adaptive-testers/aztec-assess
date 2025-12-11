import { useEffect, useState } from "react";
import { FaBook } from "react-icons/fa";
import { FaPlus } from "react-icons/fa6";
import { IoIosArrowUp } from "react-icons/io";
import { IoMdPerson } from "react-icons/io";
import { IoMdSettings } from "react-icons/io";
import { IoHome } from "react-icons/io5";
import { IoLogOut } from "react-icons/io5";
import { NavLink } from "react-router-dom";

import { privateApi } from "../../api/axios";
import { COURSES } from "../../api/endpoints";
import { AUTH } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";

interface Course {
  id: string | number;
  name: string;
  path: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

interface UserProfile {
  role: "student" | "instructor" | "admin";
}

interface BackendCourse {
  id: string | number;
  title?: string;
  name?: string;
  slug?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
}

const parseCoursesArray = (data: unknown): BackendCourse[] => {
  if (Array.isArray(data)) return data as BackendCourse[];
  if (data && typeof data === 'object') {
    const obj = data as { results?: unknown[]; courses?: unknown[] };
    if (Array.isArray(obj.results)) return obj.results as BackendCourse[];
    if (Array.isArray(obj.courses)) return obj.courses as BackendCourse[];
  }
  return [];
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [archivedCourses, setArchivedCourses] = useState<Course[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const { logout, checkingRefresh, accessToken } = useAuth();

  const toggleSidebar = () => {
    setCollapsed((prev) => !prev);

    // If collapsing and courses are open -> close them
    if (!collapsed && coursesOpen) {
      setCoursesOpen(false);
    }
  };

  useEffect(() => {
    if (checkingRefresh) {
      setLoading(true);
      return;
    }

    if (!accessToken) {
      setLoading(false);
      setCourses([]);
      setUserRole(null);
      return;
    }

    let mounted = true;
    const fetchUserProfile = async () => {
      try {
        const res = await privateApi.get<UserProfile>(AUTH.PROFILE);
        if (!mounted) return;
        setUserRole(res.data.role);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to fetch user profile:", error);
      }
    };

    const fetchCourses = async () => {
      if (!mounted) return;
      try {
        const res = await privateApi.get(COURSES.LIST);
        if (!mounted) return;

        const coursesArray = parseCoursesArray(res.data);

        const activeCourses: Course[] = [];
        const archived: Course[] = [];

        coursesArray.forEach((course: BackendCourse) => {
          const mappedCourse = {
            id: course.id,
            name: course.title || course.name || "Untitled Course",
            path: `/courses/${course.slug || course.id}`,
            status: course.status,
          };
          
          if (course.status === 'ARCHIVED') {
            archived.push(mappedCourse);
          } else {
            activeCourses.push(mappedCourse);
          }
        });

        setCourses(activeCourses);
        setArchivedCourses(archived);
      } catch (error) {
        if (!mounted) return;
        console.error("Failed to fetch courses:", error);
        setCourses([]);
        setArchivedCourses([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchUserProfile();
    fetchCourses();
    return () => {
      mounted = false;
    };
  }, [checkingRefresh, accessToken]);

  useEffect(() => {
    if (accessToken && !checkingRefresh && !loading) {
      let mounted = true;
      const fetchArchivedCourses = async () => {
        if (!mounted) return;
        try {
          const res = await privateApi.get(COURSES.LIST + '?status=ARCHIVED');
          if (!mounted) return;

          const coursesArray = parseCoursesArray(res.data);

          const mappedCourses = coursesArray.map((course: BackendCourse) => ({
            id: course.id,
            name: course.title || course.name || "Untitled Course",
            path: `/courses/${course.slug || course.id}`,
            status: course.status,
          }));
          
          if (mounted) {
            setArchivedCourses(mappedCourses);
          }
        } catch (error) {
          if (!mounted) return;
          console.error("Failed to fetch archived courses:", error);
        }
      };

      void fetchArchivedCourses();
      return () => {
        mounted = false;
      };
    }
  }, [accessToken, checkingRefresh, loading]);

  useEffect(() => {
    const handleCourseDeleted = () => {
      if (accessToken && !checkingRefresh) {
        const fetchCourses = async () => {
          try {
            const res = await privateApi.get(COURSES.LIST);
            const coursesArray = parseCoursesArray(res.data);

            const activeCourses: Course[] = [];
            const archived: Course[] = [];

            coursesArray.forEach((course: BackendCourse) => {
              const mappedCourse = {
                id: course.id,
                name: course.title || course.name || "Untitled Course",
                path: `/courses/${course.slug || course.id}`,
                status: course.status,
              };
              
              if (course.status === 'ARCHIVED') {
                archived.push(mappedCourse);
              } else {
                activeCourses.push(mappedCourse);
              }
            });

            setCourses(activeCourses);
            
            try {
              const archivedRes = await privateApi.get(COURSES.LIST + '?status=ARCHIVED');
              const archivedArray = parseCoursesArray(archivedRes.data);

              const mappedArchived = archivedArray.map((course: BackendCourse) => ({
                id: course.id,
                name: course.title || course.name || "Untitled Course",
                path: `/courses/${course.slug || course.id}`,
                status: course.status,
              }));
              
              setArchivedCourses(mappedArchived);
            } catch (archivedError) {
              console.error("Failed to fetch archived courses:", archivedError);
              setArchivedCourses(archived);
            }
          } catch (error) {
            console.error("Failed to refresh courses:", error);
            setCourses([]);
            setArchivedCourses([]);
          }
        };

        void fetchCourses();
      }
    };

    const handleCourseArchived = () => {
      handleCourseDeleted();
    };

    window.addEventListener('courseDeleted', handleCourseDeleted);
    window.addEventListener('courseArchived', handleCourseArchived);

    return () => {
      window.removeEventListener('courseDeleted', handleCourseDeleted);
      window.removeEventListener('courseArchived', handleCourseArchived);
    };
  }, [accessToken, checkingRefresh]);

  const handleLogout = () => {
    logout();
  };

  return (
    <aside
      className={`flex h-screen flex-col items-start bg-[#0F0F0F] border-r border-[#404040] shadow-[0_3px_3px_rgba(0,0,0,0.25)] overflow-hidden transition-[width] duration-300 shrink-0
      ${
        collapsed
          ? "w-[78px]"
          : "w-[210px] sm:w-[230px] md:w-[240px] lg:w-[250px]"
      }`}
    >
      {/* Header */}
      <div className="flex h-[70px] w-full items-center justify-between px-[19px] border-b border-[#404040]">
        <div
          className={`min-w-0 transition-opacity duration-200 ${
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto"
          }`}
        >
          <h2 className="truncate font-geist text-[17px] font-medium leading-[26px] tracking-[0px] text-slate-100">
            Aztec Assess
          </h2>
        </div>
        <button
          onClick={toggleSidebar}
          className="ml-auto flex h-[35px] w-[39px] items-center justify-center rounded-[7px] cursor-pointer"
        >
          <IoIosArrowUp
            className={`h-[17px] w-[17px] text-[rgba(241, 245, 249, 0.7)] transition-transform duration-300 ${
              collapsed ? "rotate-90" : "-rotate-90"
            }`}
          />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col flex-1 w-full overflow-y-auto items-start gap-[9px] px-[17px] pt-[17px]">
        {/* Dashboard */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `group relative flex items-center h-[39px] rounded-[7px] transition-colors duration-200 
            ${collapsed ? "w-[43px]" : "w-full"}
            ${isActive ? "bg-[#F87171]" : "hover:bg-[#F87171]"}`
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
              {!collapsed && (
                <span
                  className={`ml-[25px] font-geist text-[15px] font-medium leading-[22px] transition-[opacity,transform] duration-200 ease-out ${
                    collapsed
                      ? "opacity-0 -translate-x-1"
                      : "opacity-100 translate-x-0"
                  } ${
                    isActive
                      ? "text-white"
                      : "text-[rgba(241,245,249,0.7)] group-hover:text-white"
                  }`}
                >
                  Dashboard
                </span>
              )}
            </>
          )}
        </NavLink>

        {/* Profile */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `group relative flex items-center h-[39px] rounded-[7px] transition-colors duration-200 
            ${collapsed ? "w-[43px]" : "w-full"}
            ${isActive ? "bg-[#F87171]" : "hover:bg-[#F87171]"}`
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
              {!collapsed && (
                <span
                  className={`ml-[25px] font-geist text-[15px] font-medium leading-[22px] transition-[opacity,transform] duration-200 ease-out ${
                    collapsed
                      ? "opacity-0 -translate-x-1"
                      : "opacity-100 translate-x-0"
                  } ${
                    isActive
                      ? "text-white"
                      : "text-[rgba(241,245,249,0.7)] group-hover:text-white"
                  }`}
                >
                  Profile
                </span>
              )}
            </>
          )}
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `group relative flex items-center h-[39px] rounded-[7px] transition-colors duration-200 
            ${collapsed ? "w-[43px]" : "w-full"}
            ${isActive ? "bg-[#F87171]" : "hover:bg-[#F87171]"}`
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
              {!collapsed && (
                <span
                  className={`ml-[25px] font-geist text-[15px] font-medium leading-[22px] transition-[opacity,transform] duration-200 ease-out ${
                    collapsed
                      ? "opacity-0 -translate-x-1"
                      : "opacity-100 translate-x-0"
                  } ${
                    isActive
                      ? "text-white"
                      : "text-[rgba(241,245,249,0.7)] group-hover:text-white"
                  }`}
                >
                  Settings
                </span>
              )}
            </>
          )}
        </NavLink>

        {/* Courses */}
        <NavLink
          to="/courses"
          onClick={(e) => {
            e.preventDefault();
            if (!collapsed) setCoursesOpen((v) => !v);
            if (collapsed) setCoursesOpen((v) => !v);
            if (collapsed) setCollapsed((v) => !v);
          }}
          aria-expanded={coursesOpen}
          aria-controls="courses-menu"
          className={() => `group relative flex items-center h-[39px] rounded-[7px] transition-colors duration-200 hover:bg-[#F87171]
            ${collapsed ? "w-[43px]" : "w-full"}`}
        >
          <FaBook className="ml-[13px] h-[17px] w-[17px] text-[rgba(241,245,249,0.7)] transition-colors duration-200 group-hover:text-white" />

          {!collapsed && (
            <>
              <span className="ml-[25px] font-geist text-[15px] font-medium leading-[22px] text-[rgba(241,245,249,0.7)] transition-colors duration-200 group-hover:text-white">
                Courses
              </span>
              <IoIosArrowUp
                className={`ml-auto mr-[12px] h-[17px] w-[17px] text-[rgba(241,245,249,0.7)] transition-transform duration-200
                  ${coursesOpen ? "rotate-0" : "rotate-180"}`}
              />
            </>
          )}
        </NavLink>

        <div className={`${collapsed ? "hidden" : "block"} mt-[6px] w-full`}>
          <div
            id="courses-menu"
            className={`grid transition-[grid-template-rows,transform] duration-200 ${
              coursesOpen
                ? "grid-rows-[1fr] opacity-100 translate-y-0"
                : "grid-rows-[0fr] opacity-0 -translate-y-1 pointer-events-none"
            }`}
          >
            <div className="overflow-hidden">
              <div className="w-full rounded-[7px] border border-[#404040] bg-[#1A1A1A] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] p-[6px]">
                {userRole === "instructor" || userRole === "admin" ? (
                  <NavLink
                    to="/courses/create"
                    className="group/item relative flex h-[36px] items-center rounded-[5px] px-[10px] hover:bg-[#F87171]/80 transition-colors"
                  >
                    <FaPlus className="mr-[10px] h-[16px] w-[16px] text-[#A1A1AA] shrink-0" />
                    <span className="font-inter text-[15px] leading-[22px] text-[#F1F5F9] truncate">
                      Create Course
                    </span>
                  </NavLink>
                ) : (
                  <NavLink
                    to="/join-course"
                    className="group/item relative flex h-[36px] items-center rounded-[5px] px-[10px] hover:bg-[#F87171]/80 transition-colors"
                  >
                    <FaPlus className="mr-[10px] h-[16px] w-[16px] text-[#A1A1AA] shrink-0" />
                    <span className="font-inter text-[15px] leading-[22px] text-[#F1F5F9] truncate">
                      Join Course
                    </span>
                  </NavLink>
                )}

                {loading ? (
                  <div className="mt-[6px] space-y-[4px]">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="skeleton-shimmer h-[40px] rounded-[5px] bg-[#2A2A2A]"
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    {courses.length > 0 && (
                      <>
                        <div className="mx-[2px] my-[6px] h-px bg-[#404040] rounded" />
                        <div className="space-y-[4px]">
                          {courses.map((course) => (
                            <NavLink
                              key={course.id}
                              to={course.path}
                              className="group/item relative flex h-[40px] items-center rounded-[5px] px-[10px] bg-[#1A1A1A] hover:bg-[#F87171]/80 transition-colors duration-200"
                            >
                              <FaBook className="mr-[10px] h-[16px] w-[16px] text-[#F1F5F9] shrink-0" />
                              <span className="font-inter text-[14px] leading-[20px] text-[#F1F5F9] truncate flex-1 min-w-0">
                                {course.name}
                              </span>
                            </NavLink>
                          ))}
                        </div>
                      </>
                    )}
                    
                    {archivedCourses.length > 0 && (
                      <>
                        <div className="mx-[2px] my-[6px] h-px bg-[#404040] rounded" />
                        <button
                          onClick={() => setShowArchived(!showArchived)}
                          className="w-full flex h-[36px] items-center rounded-[5px] px-[10px] hover:bg-[#404040]/50 transition-colors"
                        >
                          <span className="font-inter text-[13px] leading-[20px] text-[#A1A1AA] truncate flex-1 min-w-0 text-left">
                            {showArchived ? 'Hide' : 'Show'} Archived ({archivedCourses.length})
                          </span>
                          <IoIosArrowUp
                            className={`h-[14px] w-[14px] text-[#A1A1AA] transition-transform duration-200 ${
                              showArchived ? "rotate-0" : "rotate-180"
                            }`}
                          />
                        </button>
                        
                        <div 
                          className={`space-y-[4px] overflow-hidden transition-all duration-300 ease-in-out ${
                            showArchived ? 'max-h-[500px] opacity-100 mt-[4px]' : 'max-h-0 opacity-0'
                          }`}
                        >
                          {archivedCourses.map((course) => (
                            <NavLink
                              key={course.id}
                              to={course.path}
                              className="group/item relative flex h-[40px] items-center rounded-[5px] px-[10px] bg-[#1A1A1A] hover:bg-[#F87171]/80 transition-colors duration-200 opacity-60"
                            >
                              <FaBook className="mr-[10px] h-[16px] w-[16px] text-[#F1F5F9] shrink-0" />
                              <span className="font-inter text-[14px] leading-[20px] text-[#F1F5F9] truncate flex-1 min-w-0">
                                {course.name}
                              </span>
                            </NavLink>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Logout */}
      <div className="flex h-[75px] w-full flex-col items-start border-t border-[#404040] px-[17px] pt-[19px]">
        <button
          type="button"
          onClick={handleLogout}
          className={`group relative flex items-center h-[39px] rounded-[7px] transition-colors duration-200 hover:bg-[#F87171] focus:outline-none cursor-pointer
          ${collapsed ? "w-[43px]" : "w-full"}`}
          aria-label="Logout"
        >
          <IoLogOut
            className={`ml-[13px] h-[17px] w-[17px] transition-colors duration-200 text-[rgba(241,245,249,0.7)] group-hover:text-white`}
          />

          {!collapsed && (
            <span
              className={`ml-[25px] font-geist text-[15px] font-medium leading-[22px] transition-[opacity,transform] duration-200 ease-out opacity-100 translate-x-0 text-[rgba(241,245,249,0.7)] group-hover:text-white`}
            >
              Logout
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
