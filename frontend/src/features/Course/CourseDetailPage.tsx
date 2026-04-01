import axios from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { FiCopy, FiRefreshCw, FiX } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';

import { privateApi } from '../../api/axios';
import { AUTH, COURSES } from '../../api/endpoints';
import { Toast } from '../../components/Toast';
import { useProfileRole } from '../../context/ProfileRoleContext';

interface Course {
  id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  join_code: string | null;
  join_code_enabled: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

interface FormFields {
  title: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormFields>();
  const watchedTitle = watch('title');

  const [course, setCourse] = useState<Course | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [resolvedCourseId, setResolvedCourseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userCourseRole, setUserCourseRole] = useState<'OWNER' | 'INSTRUCTOR' | 'TA' | 'STUDENT' | null>(null);
  const [roleResolved, setRoleResolved] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const effectiveCourseId = resolvedCourseId ?? courseId ?? null;

  useEffect(() => {
    if (!courseId) return;

    const resolveCourseId = async () => {
      if (UUID_REGEX.test(courseId)) {
        setResolvedCourseId(courseId);
        return;
      }

      try {
        const parseCoursesArray = (data: unknown): Course[] => {
          if (Array.isArray(data)) return data;
          if (data && typeof data === 'object') {
            const obj = data as { results?: unknown[]; courses?: unknown[] };
            if (Array.isArray(obj.results)) return obj.results as Course[];
            if (Array.isArray(obj.courses)) return obj.courses as Course[];
          }
          return [];
        };

        const response = await privateApi.get(COURSES.LIST);
        const coursesArray = parseCoursesArray(response.data);
        let matchingCourse = coursesArray.find((c: Course) => c.slug === courseId);
        
        if (!matchingCourse) {
          try {
            const archivedResponse = await privateApi.get(COURSES.LIST + '?status=ARCHIVED');
            const archivedArray = parseCoursesArray(archivedResponse.data);
            matchingCourse = archivedArray.find((c: Course) => c.slug === courseId);
          } catch (archivedError) {
            console.error('Failed to fetch archived courses:', archivedError);
          }
        }

        if (matchingCourse) {
          setResolvedCourseId(matchingCourse.id);
        } else {
          setToast({ message: 'Course not found', type: 'error' });
        }
      } catch (error) {
        console.error('Failed to resolve course ID:', error);
        setToast({ message: 'Failed to load course', type: 'error' });
      }
    };

    void resolveCourseId();
  }, [courseId]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await privateApi.get(AUTH.PROFILE);
        setCurrentUserId(response.data.id);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    void fetchUserProfile();
  }, []);

  useEffect(() => {
    if (!resolvedCourseId) return;
    setRoleResolved(false);

    setIsLoading(true);
    const fetchCourseData = async () => {
      try {
        const response = await privateApi.get(COURSES.DETAIL(resolvedCourseId));
        const courseData: Course = response.data;
        setCourse(courseData);
        setValue('title', courseData.title);
      } catch (error) {
        console.error('Failed to fetch course:', error);
        setToast({ message: 'Failed to load course data', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchCourseRole = async () => {
      try {
        const response = await privateApi.get<{ user_id: string; role: string }[]>(
          COURSES.MEMBERS(resolvedCourseId)
        );
        const mems = Array.isArray(response.data) ? response.data : [];
        if (currentUserId !== null) {
          const normalizedCurrent = String(currentUserId).toLowerCase().trim();
          const member = mems.find(
            (m) => String(m.user_id).toLowerCase().trim() === normalizedCurrent
          );
          if (member && ["OWNER", "INSTRUCTOR", "TA", "STUDENT"].includes(member.role)) {
            setUserCourseRole(member.role as "OWNER" | "INSTRUCTOR" | "TA" | "STUDENT");
          } else {
            setUserCourseRole(null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch members for role verification:', error);
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          setUserCourseRole('STUDENT');
        } else {
          setUserCourseRole(null);
        }
      } finally {
        setRoleResolved(true);
      }
    };

    void fetchCourseData();
    if (currentUserId !== null) {
      void fetchCourseRole();
    }
  }, [resolvedCourseId, setValue, currentUserId]);

  const { profileRole, loading: profileRoleLoading } = useProfileRole();
  const roleLoading = !roleResolved;
  /** Student layout after role verification completes. */
  const showStudentLayout =
    userCourseRole === 'STUDENT' ||
    (!profileRoleLoading && userCourseRole === null && profileRole === 'student');

  const refreshCourseData = async () => {
    if (!resolvedCourseId) return;
    try {
      const response = await privateApi.get(COURSES.DETAIL(resolvedCourseId));
      const courseData: Course = response.data;
      setCourse(courseData);
      setValue('title', courseData.title);
    } catch (error) {
      console.error('Failed to fetch course:', error);
      setToast({ message: 'Failed to load course data', type: 'error' });
    }
  };



  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    if (!resolvedCourseId) return;
    
    try {
      await privateApi.patch(COURSES.UPDATE(resolvedCourseId), {
        title: data.title,
      });
      await refreshCourseData();
      setToast({ message: 'Course updated successfully', type: 'success' });
    } catch (error) {
      console.error('Failed to update course:', error);
      if (axios.isAxiosError(error)) {
        const backendMessage = error.response?.data?.detail || error.response?.data?.message;
        setToast({ 
          message: backendMessage || 'Failed to update course', 
          type: 'error' 
        });
      } else {
        setToast({ message: 'An unexpected error occurred', type: 'error' });
      }
    }
  };

  const handleActivateCourse = async () => {
    if (!resolvedCourseId) return;
    
    try {
      await privateApi.post(COURSES.ACTIVATE(resolvedCourseId));
      await refreshCourseData();
      setToast({ message: 'Course activated successfully', type: 'success' });
    } catch (error) {
      console.error('Failed to activate course:', error);
      if (axios.isAxiosError(error)) {
        const backendMessage = error.response?.data?.detail || error.response?.data?.message;
        setToast({ 
          message: backendMessage || 'Failed to activate course', 
          type: 'error' 
        });
      } else {
        setToast({ message: 'Failed to activate course', type: 'error' });
      }
    }
  };

  const handleArchiveCourse = async () => {
    if (!resolvedCourseId) return;
    
    setIsArchiving(true);
    try {
      await privateApi.post(COURSES.ARCHIVE(resolvedCourseId));
      await refreshCourseData();
      setToast({ message: 'Course archived successfully', type: 'success' });
      setShowArchiveModal(false);
      window.dispatchEvent(new CustomEvent('courseArchived'));
    } catch (error) {
      console.error('Failed to archive course:', error);
      if (axios.isAxiosError(error)) {
        const backendMessage = error.response?.data?.detail || error.response?.data?.message;
        setToast({ 
          message: backendMessage || 'Failed to archive course', 
          type: 'error' 
        });
      } else {
        setToast({ message: 'Failed to archive course', type: 'error' });
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!resolvedCourseId) return;
    
    setIsDeleting(true);
    try {
      await privateApi.delete(COURSES.DELETE(resolvedCourseId));
      setToast({ message: 'Course deleted successfully', type: 'success' });
      setShowDeleteModal(false);
      window.dispatchEvent(new CustomEvent('courseDeleted'));
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Failed to delete course:', error);
      if (axios.isAxiosError(error)) {
        const backendMessage = error.response?.data?.detail || error.response?.data?.message;
        setToast({ 
          message: backendMessage || 'Failed to delete course', 
          type: 'error' 
        });
      } else {
        setToast({ message: 'Failed to delete course', type: 'error' });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCode = () => {
    if (course?.join_code) {
      navigator.clipboard.writeText(course.join_code);
      setToast({ message: 'Join code copied to clipboard', type: 'success' });
    }
  };

  const handleRotateCode = async () => {
    if (!resolvedCourseId) return;
    
    try {
      const response = await privateApi.post(COURSES.ROTATE_JOIN_CODE(resolvedCourseId));
      setCourse(prev => prev ? { ...prev, join_code: response.data.join_code } : null);
      setToast({ message: 'Join code rotated successfully', type: 'success' });
    } catch (error) {
      console.error('Failed to rotate join code:', error);
      setToast({ message: 'Failed to rotate join code', type: 'error' });
    }
  };

  const handleToggleJoinCode = async () => {
    if (!resolvedCourseId || !course) return;
    
    try {
      const endpoint = course.join_code_enabled 
        ? COURSES.DISABLE_JOIN_CODE(resolvedCourseId)
        : COURSES.ENABLE_JOIN_CODE(resolvedCourseId);
      
      const response = await privateApi.post(endpoint);
      setCourse(prev => prev ? { 
        ...prev, 
        join_code_enabled: response.data.join_code_enabled,
        join_code: response.data.join_code || prev.join_code
      } : null);
      setToast({ 
        message: `Join code ${response.data.join_code_enabled ? 'enabled' : 'disabled'}`, 
        type: 'success' 
      });
    } catch (error) {
      console.error('Failed to toggle join code:', error);
      setToast({ message: 'Failed to toggle join code', type: 'error' });
    }
  };



  const hasChanges = course ? watchedTitle !== course.title : false;
  const isActive = course?.status === 'ACTIVE';
  const isArchived = course?.status === 'ARCHIVED';
  const isStaff = userCourseRole !== null && ['OWNER', 'INSTRUCTOR', 'TA'].includes(userCourseRole);
  const isOwnerOrInstructor = userCourseRole !== null && ['OWNER', 'INSTRUCTOR'].includes(userCourseRole);
  const canViewMembersTab = isStaff || showStudentLayout;

  return (
    <>
      <section className="min-h-screen w-full bg-[#0A0A0A] text-[#F1F5F9] geist-font">
        <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[482px] bg-[#1A1A1A] border border-[#404040] rounded-[15px] shadow-[0_4px_6px_rgba(0,0,0,0.25)] p-6 md:p-[40px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#F1F5F9] text-[24px] font-medium">Delete Course</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 hover:bg-[#262626] rounded transition-colors cursor-pointer"
                aria-label="Close modal"
                disabled={isDeleting}
              >
                <FiX className="text-[#F1F5F9] text-xl" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <p className="text-[#F1F5F9] text-[15px] leading-[22px]">
                Are you sure you want to permanently delete <span className="font-semibold">{course?.title}</span>? 
                All course data including members, assignments, and submissions will be removed. This action cannot be reversed.
              </p>
              
              <div className="flex justify-end gap-[10px] pt-4 border-t border-[#404040]">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="h-[35px] px-[13px] rounded-[7px] text-[15px] text-[#F1F5F9] bg-[#404040] hover:bg-[#525252] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteCourse}
                  disabled={isDeleting}
                  className={`h-[35px] px-[13px] rounded-[7px] min-w-[120px] text-[15px] text-white bg-[#EF6262] transition-all duration-200 ${
                    isDeleting
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:ring-2 hover:ring-[#FCA5A5] hover:ring-offset-2 hover:ring-offset-[#1A1A1A] hover:scale-105"
                  }`}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[482px] bg-[#1A1A1A] border border-[#404040] rounded-[15px] shadow-[0_4px_6px_rgba(0,0,0,0.25)] p-6 md:p-[40px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#F1F5F9] text-[24px] font-medium">Archive Course</h2>
              <button
                onClick={() => setShowArchiveModal(false)}
                className="p-2 hover:bg-[#262626] rounded transition-colors cursor-pointer"
                aria-label="Close modal"
                disabled={isArchiving}
              >
                <FiX className="text-[#F1F5F9] text-xl" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <p className="text-[#F1F5F9] text-[15px] leading-[22px]">
                Are you sure you want to archive <span className="font-semibold">{course?.title}</span>? 
                Archived courses become read-only and students will no longer be able to join. You can still view course data.
              </p>
              
              <div className="flex justify-end gap-[10px] pt-4 border-t border-[#404040]">
                <button
                  type="button"
                  onClick={() => setShowArchiveModal(false)}
                  disabled={isArchiving}
                  className="h-[35px] px-[13px] rounded-[7px] text-[15px] text-[#F1F5F9] bg-[#404040] hover:bg-[#525252] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleArchiveCourse}
                  disabled={isArchiving}
                  className={`h-[35px] px-[13px] rounded-[7px] min-w-[120px] text-[15px] text-white bg-[#EF6262] transition-all duration-200 ${
                    isArchiving
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:ring-2 hover:ring-[#FCA5A5] hover:ring-offset-2 hover:ring-offset-[#1A1A1A] hover:scale-105"
                  }`}
                >
                  {isArchiving ? 'Archiving...' : 'Yes, Archive Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Top Header Row: course title; status and Activate only when loaded */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {isLoading ? (
            <div className="skeleton-shimmer h-9 w-48 rounded" />
          ) : (
            <h1 className="text-[24px] font-normal leading-9 tracking-[0.0703px] text-[#F1F5F9] truncate">
              {course?.title ?? 'Course'}
            </h1>
          )}
          {!isLoading && course && isStaff && (
            <span className={`inline-block px-3 py-1 rounded-md text-[13px] font-semibold tracking-wide shrink-0 ${
              isActive
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : isArchived
                  ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                  : 'bg-[#262626] text-[#A1A1AA] border border-[#404040]'
            }`}>
              {course.status}
            </span>
          )}
        </div>
        {!isLoading && isOwnerOrInstructor && !isArchived && !isActive && (
          <button
            onClick={handleActivateCourse}
            className="px-6 py-2 rounded-lg text-white text-[14px] font-medium tracking-wide transition-colors bg-[#F87171] hover:bg-[#FCA5A5] cursor-pointer shrink-0"
          >
            Activate Course
          </button>
        )}
      </div>

      {/* Top nav */}
      {effectiveCourseId && (
        <div className="mt-4 mb-6 rounded-2xl border border-[#404040] bg-gradient-to-b from-[#1A1A1A] via-[#1F1F1F] to-[#1A1A1A] p-1 shadow-[0px_4px_12px_rgba(0,0,0,0.3)]">
          {roleLoading ? (
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-[#232323]" />
              ))}
            </div>
          ) : (
            <div className={`grid grid-cols-2 gap-1 ${canViewMembersTab ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
              <button
                type="button"
                onClick={() => navigate(`/courses/${effectiveCourseId}`)}
                className="h-12 rounded-xl text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#A1A1AA] hover:bg-[#151515] transition"
              >
                Quizzes
              </button>
              {canViewMembersTab && (
                <button
                  type="button"
                  onClick={() => navigate(`/courses/${effectiveCourseId}/students`)}
                  className="h-12 rounded-xl text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#A1A1AA] hover:bg-[#151515] transition"
                >
                  Members
                </button>
              )}
              <button
                type="button"
                className="h-12 rounded-xl text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#A1A1AA] hover:bg-[#151515] transition"
              >
                Grades
              </button>
              <button
                type="button"
                className="h-12 rounded-xl bg-[#F87171] text-[16px] font-normal leading-6 tracking-[-0.3125px] text-white shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]"
              >
                Course Info
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Action Buttons for Save/Cancel */}
      <div 
        data-testid="save-actions-bar"
        className={`fixed bottom-8 right-8 z-50 flex items-center gap-4 transition-all duration-500 ease-in-out ${
          isOwnerOrInstructor && !isArchived && hasChanges 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-[150%] opacity-0 pointer-events-none'
        }`}
      >
        <button 
          type="button"
          onClick={() => {
            if (course) setValue('title', course.title);
          }}
          disabled={isSubmitting}
          className="px-6 py-3 rounded-full text-white font-medium bg-[#404040] hover:bg-[#525252] shadow-[0px_10px_20px_rgba(0,0,0,0.4)] transition-all duration-200 hover:scale-105"
        >
          Cancel
        </button>
        <button 
          type="submit"
          form="course-edit-form"
          disabled={isSubmitting}
          className={`flex items-center gap-2 px-6 py-3 rounded-full text-white font-medium shadow-[0px_10px_20px_rgba(0,0,0,0.4)] transition-all duration-200 hover:scale-105 ${
            isSubmitting 
              ? 'bg-[#F87171]/70 cursor-not-allowed' 
              : 'bg-[#F87171] cursor-pointer'
          }`}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Course Information Card */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#404040] px-[26px] py-4 md:py-[22px]">
            <h2 className="text-[17px] leading-[17px] tracking-[0px] text-[#F1F5F9]">
              Course Information
            </h2>
          </div>
          
          <div className="flex flex-col gap-4 md:gap-[26px] px-[26px] py-4 md:py-[26px]">
            <div className="flex flex-col gap-[9px]">
              <div className="flex justify-between">
                <label
                  htmlFor="title-input"
                  className="text-[15px] leading-[15px] text-[#F1F5F9]"
                >
                  Course Title
                </label>
                {!isLoading && errors.title && (
                  <p className="text-[15px] leading-[15px] text-[#EF6262]">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {isLoading ? (
                <div className="skeleton-shimmer h-[52px] w-full rounded-[7px] bg-[#2A2A2A]"></div>
              ) : (
                <form id="course-edit-form" onSubmit={handleSubmit(onSubmit)}>
                  {isOwnerOrInstructor && !isArchived ? (
                    <div className="flex h-[52px] w-full items-center rounded-[7px] bg-[#262626] pl-[13px] pr-[13px] border border-[#404040] focus-within:border-[#F87171] transition-all duration-200">
                      <input
                        {...register("title", { 
                          required: "Course title is required",
                          maxLength: { value: 200, message: "Course title must be 200 characters or less" }
                        })}
                        id="title-input"
                        type="text"
                        placeholder="e.g., Introduction to Psychology"
                        maxLength={200}
                        className="w-full bg-transparent text-[17px] text-[#F1F5F9] outline-none placeholder:text-[#8E8E8E]"
                      />
                    </div>
                  ) : (
                    <div className="flex h-[52px] w-full items-center rounded-[7px] bg-[#262626] pl-[13px] pr-[13px] border border-[#404040]">
                      <p className="w-full bg-transparent text-[17px] text-[#F1F5F9]">
                        {course?.title || 'Loading...'}
                      </p>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Join Code Card (Staff only) */}
        {isStaff && !isArchived && (
          <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#404040] px-[26px] py-4 md:py-[22px]">
              <div>
                <h2 className="text-[17px] leading-[17px] tracking-[0px] text-[#F1F5F9]">
                  Join Code
                </h2>
                <p className="text-[#94A3B8] text-[13px] mt-1">
                  Allow students to join using a course code
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-4 md:gap-[26px] px-[26px] py-4 md:py-[26px]">
              {isLoading ? (
                <div className="skeleton-shimmer h-[40px] w-[150px] rounded-lg bg-[#2A2A2A]"></div>
              ) : (
                <>
                  {isOwnerOrInstructor && (
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleToggleJoinCode}
                        disabled={!isActive}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          course?.join_code_enabled
                            ? 'bg-[#525252] hover:bg-[#6B6B6B] text-primary-text cursor-pointer'
                            : isActive
                              ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
                              : 'bg-green-600/50 text-white/70 cursor-not-allowed'
                        }`}
                      >
                        {course?.join_code_enabled ? 'Disable' : 'Enable'} Join Code
                      </button>
                      {!isActive && (
                        <p className="text-secondary-text text-xs">Course must be active to enable join code</p>
                      )}
                    </div>
                  )}
                  {course?.join_code_enabled && course?.join_code && (
                    <>
                      <div className="inline-flex items-center gap-2 px-4 py-3 bg-[#262626] border border-[#404040] rounded-lg">
                        <span className="px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide bg-green-500/20 text-green-500">
                          Enabled
                        </span>
                        <div className="flex items-center gap-3 ml-2">
                          <span className="text-[#F1F5F9] font-mono text-sm">
                            {course.join_code}
                          </span>
                          {isOwnerOrInstructor && (
                            <>
                              <button
                                type="button"
                                onClick={handleCopyCode}
                                className="p-1.5 hover:bg-[#404040] rounded transition-colors cursor-pointer"
                                aria-label="Copy code"
                              >
                                <FiCopy className="text-[#A1A1AA] text-base hover:text-[#F1F5F9] transition-colors" />
                              </button>
                              <button
                                type="button"
                                onClick={handleRotateCode}
                                className="p-1.5 hover:bg-[#404040] rounded transition-colors cursor-pointer"
                                aria-label="Rotate code"
                              >
                                <FiRefreshCw className="text-[#A1A1AA] text-base hover:text-[#F1F5F9] transition-colors" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-[#A1A1AA] text-xs mt-2">
                        Share this code with students to allow them to join the course. {isOwnerOrInstructor && 'You can rotate the code at any time to generate a new one.'}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      {isOwnerOrInstructor && (
        <div className="mt-8 pt-8 border-t border-[#404040]">
          <div className="w-full rounded-[13px] border border-[#EF6262]/30 bg-[#2A1414]/30 shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#EF6262]/30 px-[26px] py-4 md:py-[22px]">
              <div>
                <h2 className="text-[17px] leading-[17px] tracking-[0px] text-[#EF6262]">
                  Danger Zone
                </h2>
                <p className="text-[#A1A1AA] text-[13px] mt-1">
                  These actions are permanent and cannot be undone
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-6 px-[26px] py-4 md:py-[26px]">
              {isActive && (
                <div className="flex items-center justify-between pb-6 border-b border-[#404040]">
                  <div className="flex-1 mr-4">
                    <h3 className="text-[15px] font-medium text-[#F1F5F9] mb-1">Archive this course</h3>
                    <p className="text-[13px] text-[#A1A1AA]">
                      Mark this course as archived. Archived courses become read-only and students can no longer join. You can still view course data.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowArchiveModal(true)}
                    className="px-5 py-2 rounded-lg text-white text-sm font-medium tracking-wide transition-colors bg-[#EF6262] hover:bg-[#F87171] cursor-pointer whitespace-nowrap"
                  >
                    Archive Course
                  </button>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                  <h3 className="text-[15px] font-medium text-[#F1F5F9] mb-1">Delete this course</h3>
                  <p className="text-[13px] text-[#A1A1AA]">
                    Permanently remove this course and all its data including members, assignments, and submissions. This action cannot be reversed.
                  </p>
                </div>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="px-5 py-2 rounded-lg text-white text-sm font-medium tracking-wide transition-colors bg-[#EF6262] hover:bg-[#F87171] cursor-pointer whitespace-nowrap"
                >
                  Delete Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </section>
  </>
);
}
