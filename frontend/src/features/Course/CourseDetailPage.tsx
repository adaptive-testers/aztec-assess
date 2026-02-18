import axios from 'axios';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { FaTrash } from 'react-icons/fa';
import { FiCopy, FiRefreshCw, FiX } from 'react-icons/fi';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { privateApi } from '../../api/axios';
import { AUTH, COURSES } from '../../api/endpoints';
import { Toast } from '../../components/Toast';
import StudentQuizList from '../StudentQuizzes/StudentQuizList';

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

interface Member {
  id: string;
  user_id: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  role: 'OWNER' | 'INSTRUCTOR' | 'TA' | 'STUDENT';
  joined_at: string;
}

interface FormFields {
  title: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormFields>();
  const watchedTitle = watch('title');

  const [activeTab, setActiveTab] = useState<'details' | 'quizzes' | 'members'>('details');
  const [course, setCourse] = useState<Course | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [resolvedCourseId, setResolvedCourseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userCourseRole, setUserCourseRole] = useState<'OWNER' | 'INSTRUCTOR' | 'TA' | 'STUDENT' | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

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

    const fetchMembers = async () => {
      try {
        const response = await privateApi.get(COURSES.MEMBERS(resolvedCourseId));
        const membersData: Member[] = response.data;
        setMembers(membersData);
      } catch (error) {
        console.error('Failed to fetch members:', error);
        if (axios.isAxiosError(error) && error.response?.status === 403) {
          setUserCourseRole('STUDENT');
          setMembers([]);
        } else {
          setToast({ message: 'Failed to load members', type: 'error' });
        }
      }
    };

    void fetchCourseData();
    void fetchMembers();
  }, [resolvedCourseId, setValue]);

  useEffect(() => {
    if (!effectiveCourseId) return;
    const path = location.pathname;
    if (path.endsWith('/quizzes')) setActiveTab('quizzes');
    else if (path.endsWith('/members')) setActiveTab('members');
    else setActiveTab('details');
  }, [location.pathname, effectiveCourseId]);

  useEffect(() => {
    if (currentUserId && members.length > 0) {
      const normalizedCurrentUserId = String(currentUserId).toLowerCase().trim();
      const currentUserMember = members.find(m => {
        const normalizedMemberUserId = String(m.user_id).toLowerCase().trim();
        return normalizedMemberUserId === normalizedCurrentUserId;
      });
      
      if (currentUserMember) {
        setUserCourseRole(currentUserMember.role);
      }
    }
  }, [currentUserId, members]);

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

  const refreshMembers = async () => {
    if (!resolvedCourseId) return;
    try {
      const response = await privateApi.get(COURSES.MEMBERS(resolvedCourseId));
      const membersData: Member[] = response.data;
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setToast({ message: 'Failed to load members', type: 'error' });
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

  const handleRemoveMember = async () => {
    if (!resolvedCourseId || !memberToRemove) return;
    
    try {
      await privateApi.post(COURSES.REMOVE_MEMBER(resolvedCourseId), {
        user_id: memberToRemove.user_id
      });
      await refreshMembers();
      setToast({ message: 'Member removed successfully', type: 'success' });
      setShowRemoveMemberModal(false);
      setMemberToRemove(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
      setToast({ message: 'Failed to remove member', type: 'error' });
    }
  };

  const openRemoveMemberModal = (member: Member) => {
    setMemberToRemove(member);
    setShowRemoveMemberModal(true);
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim() || !resolvedCourseId) return;
    
    setIsAddingMember(true);
    try {
      await privateApi.post(COURSES.ADD_MEMBER(resolvedCourseId), {
        email: memberEmail.trim(),
        role: 'STUDENT'
      });
      await refreshMembers();
      const message = course?.status === 'DRAFT' 
        ? 'Member added successfully. They will be able to access the course once it is activated.'
        : 'Member added successfully';
      setToast({ message, type: 'success' });
      setShowAddMemberModal(false);
      setMemberEmail('');
    } catch (error) {
      console.error('Failed to add member:', error);
      if (axios.isAxiosError(error)) {
        const backendMessage = error.response?.data?.detail || error.response?.data?.message;
        setToast({ 
          message: backendMessage || 'Failed to add member', 
          type: 'error' 
        });
      } else {
        setToast({ message: 'Failed to add member', type: 'error' });
      }
    } finally {
      setIsAddingMember(false);
    }
  };

  const hasChanges = course ? watchedTitle !== course.title : false;
  const isActive = course?.status === 'ACTIVE';
  const isArchived = course?.status === 'ARCHIVED';
  const isStaff = userCourseRole !== null && ['OWNER', 'INSTRUCTOR', 'TA'].includes(userCourseRole);
  const isOwnerOrInstructor = userCourseRole !== null && ['OWNER', 'INSTRUCTOR'].includes(userCourseRole);

  return (
    <>
      <div className="min-h-screen w-full p-6 geist-font bg-primary-background">
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

      {showRemoveMemberModal && memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[482px] bg-[#1A1A1A] border border-[#404040] rounded-[15px] shadow-[0_4px_6px_rgba(0,0,0,0.25)] p-6 md:p-[40px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#F1F5F9] text-[24px] font-medium">Remove Member</h2>
              <button
                onClick={() => {
                  setShowRemoveMemberModal(false);
                  setMemberToRemove(null);
                }}
                className="p-2 hover:bg-[#262626] rounded transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <FiX className="text-[#F1F5F9] text-xl" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4">
              <p className="text-[#F1F5F9] text-[15px] leading-[22px]">
                Are you sure you want to remove{' '}
                <span className="font-semibold">
                  {memberToRemove.user_first_name && memberToRemove.user_last_name
                    ? `${memberToRemove.user_first_name} ${memberToRemove.user_last_name}`
                    : memberToRemove.user_email || 'this member'}
                </span>{' '}
                from this course? This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-[10px] pt-4 border-t border-[#404040]">
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoveMemberModal(false);
                    setMemberToRemove(null);
                  }}
                  className="h-[35px] px-[13px] rounded-[7px] text-[15px] text-[#F1F5F9] bg-[#404040] hover:bg-[#525252] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRemoveMember}
                  className="h-[35px] px-[13px] rounded-[7px] min-w-[120px] text-[15px] text-white bg-[#EF6262] transition-all duration-200 hover:ring-2 hover:ring-[#FCA5A5] hover:ring-offset-2 hover:ring-offset-[#1A1A1A] hover:scale-105"
                >
                  Remove Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[482px] bg-[#1A1A1A] border border-[#404040] rounded-[15px] shadow-[0_4px_6px_rgba(0,0,0,0.25)] p-6 md:p-[40px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#F1F5F9] text-[24px] font-medium">Add Member</h2>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setMemberEmail('');
                }}
                className="p-2 hover:bg-[#262626] rounded transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <FiX className="text-[#F1F5F9] text-xl" />
              </button>
            </div>
            
              <div className="flex flex-col gap-4">
              {course?.status === 'DRAFT' && (
                <div className="px-4 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                  <p className="text-yellow-500 text-[13px]">
                    This course is in draft status. Members will be added but won&apos;t be able to access the course until it&apos;s activated.
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-[9px]">
                <label
                  htmlFor="member-email-input"
                  className="text-[15px] leading-[15px] text-[#F1F5F9]"
                >
                  Email Address
                </label>
                <div className="flex h-[52px] w-full items-center rounded-[7px] bg-[#262626] pl-[13px] pr-[13px] border border-[#404040] focus-within:border-[#F87171] transition-all duration-200">
                  <input
                    id="member-email-input"
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-transparent text-[17px] text-[#F1F5F9] outline-none placeholder:text-[#8E8E8E]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && memberEmail.trim()) {
                        handleAddMember();
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-[10px] pt-4 border-t border-[#404040]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setMemberEmail('');
                  }}
                  className="h-[35px] px-[13px] rounded-[7px] text-[15px] text-[#F1F5F9] bg-[#404040] hover:bg-[#525252] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!memberEmail.trim() || isAddingMember}
                  className={`h-[35px] px-[13px] rounded-[7px] min-w-[120px] text-[15px] text-white bg-[#F87171] transition-all duration-200 ${
                    !memberEmail.trim() || isAddingMember
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:ring-2 hover:ring-[#FCA5A5] hover:ring-offset-2 hover:ring-offset-[#1A1A1A] hover:scale-105"
                  }`}
                >
                  {isAddingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-primary-text text-2xl font-medium tracking-wide">
            {isArchived 
              ? 'Course Details' 
              : isOwnerOrInstructor 
                ? 'Edit Course'
                : 'Course Info'}
          </h1>
          <p className="text-secondary-text text-sm mt-1">
            {isArchived 
              ? 'View course information and members' 
              : isStaff 
                ? 'Configure your course settings and manage members'
                : 'View course information and members'}
          </p>
        </div>
        {isOwnerOrInstructor && !isArchived && (
          <div className="flex gap-3 items-center">
            <button 
              type="submit"
              form="course-edit-form"
              disabled={isSubmitting || !hasChanges}
              className={`px-6 py-2 rounded-lg text-sm font-medium tracking-wide transition-colors ${
                isSubmitting || !hasChanges
                  ? 'bg-secondary-background border-2 border-primary-border text-primary-text opacity-70 cursor-not-allowed'
                  : 'bg-secondary-background border-2 border-primary-border text-primary-text hover:bg-secondary-accent-hover cursor-pointer'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            {!isActive && (
              <button 
                onClick={handleActivateCourse}
                className="px-6 py-2 rounded-lg text-primary-text text-sm font-medium tracking-wide transition-colors bg-primary-accent hover:bg-primary-accent-hover cursor-pointer"
              >
                Activate Course
              </button>
            )}
          </div>
        )}
      </div>

      {course && isStaff && (
        <div className="mb-6">
          <span className={`inline-block px-3 py-1 rounded-md text-xs font-semibold tracking-wide ${
            isActive 
              ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
              : isArchived
                ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30'
                : 'bg-secondary-background text-secondary-text border-2 border-primary-border'
          }`}>
            {course.status}
          </span>
        </div>
      )}

      <div className="border-b border-primary-border mb-6">
        <div className="flex gap-8">
          <button
            onClick={() => { if (courseId) { navigate(`/courses/${courseId}`); setActiveTab('details'); } }}
            className={`pb-3 px-1 text-sm font-medium tracking-wide transition-colors relative ${
              activeTab === 'details'
                ? 'text-primary-text'
                : 'text-secondary-text hover:text-primary-text'
            }`}
          >
            Course Details
            {activeTab === 'details' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-accent"></div>
            )}
          </button>
          <button
            onClick={() => { if (courseId) { navigate(`/courses/${courseId}/quizzes`); setActiveTab('quizzes'); } }}
            className={`pb-3 px-1 text-sm font-medium tracking-wide transition-colors relative ${
              activeTab === 'quizzes'
                ? 'text-primary-text'
                : 'text-secondary-text hover:text-primary-text'
            }`}
          >
            Quizzes
            {activeTab === 'quizzes' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-accent"></div>
            )}
          </button>
          <button
            onClick={() => { if (courseId) { navigate(`/courses/${courseId}/members`); setActiveTab('members'); } }}
            className={`pb-3 px-1 text-sm font-medium tracking-wide transition-colors relative ${
              activeTab === 'members'
                ? 'text-primary-text'
                : 'text-secondary-text hover:text-primary-text'
            }`}
          >
            Members ({members.length})
            {activeTab === 'members' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-accent"></div>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'quizzes' ? (
        effectiveCourseId && (
          <StudentQuizList courseId={resolvedCourseId ?? undefined} />
        )
      ) : activeTab === 'details' ? (
        <div className="space-y-6">
          {isLoading ? (
            <>
              <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#404040] px-[26px] py-4 md:py-[22px]">
                  <div className="skeleton-shimmer h-[17px] w-[150px] rounded bg-[#2A2A2A]"></div>
                </div>
                <div className="flex flex-col gap-4 md:gap-[26px] px-[26px] py-4 md:py-[26px]">
                  <div className="flex flex-col gap-[9px]">
                    <div className="skeleton-shimmer h-[15px] w-[100px] rounded bg-[#2A2A2A]"></div>
                    <div className="skeleton-shimmer h-[52px] w-full rounded-[7px] bg-[#2A2A2A]"></div>
                  </div>
                </div>
              </div>

              <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#404040] px-[26px] py-4 md:py-[22px]">
                  <div className="flex flex-col gap-2">
                    <div className="skeleton-shimmer h-[17px] w-[100px] rounded bg-[#2A2A2A]"></div>
                    <div className="skeleton-shimmer h-[13px] w-[200px] rounded bg-[#2A2A2A]"></div>
                  </div>
                </div>
                <div className="flex flex-col gap-4 md:gap-[26px] px-[26px] py-4 md:py-[26px]">
                  <div className="skeleton-shimmer h-[40px] w-[150px] rounded-lg bg-[#2A2A2A]"></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#404040] px-[26px] py-4 md:py-[22px]">
                  <h2 className="text-[17px] leading-[17px] tracking-[0px] text-[#F1F5F9]">
                    Course Information
                  </h2>
                </div>
                
                <form id="course-edit-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 md:gap-[26px] px-[26px] py-4 md:py-[26px]">
                  <div className="flex flex-col gap-[9px]">
                    <div className="flex justify-between">
                      <label
                        htmlFor="title-input"
                        className="text-[15px] leading-[15px] text-[#F1F5F9]"
                      >
                        Course Title
                      </label>
                      {errors.title && (
                        <p className="text-[15px] leading-[15px] text-[#EF6262]">
                          {errors.title.message}
                        </p>
                      )}
                    </div>
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
                  </div>
                </form>
              </div>

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
                  <div className="inline-flex items-center gap-2 px-4 py-3 bg-primary-background border-2 border-primary-border rounded-lg">
                    <span className="px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide bg-green-500/20 text-green-500">
                      Enabled
                    </span>
                    <div className="flex items-center gap-3 ml-2">
                      <span className="text-primary-text font-mono text-sm">
                        {course.join_code}
                      </span>
                      {isOwnerOrInstructor && (
                        <>
                          <button
                            type="button"
                            onClick={handleCopyCode}
                            className="p-1.5 hover:bg-secondary-background rounded transition-colors cursor-pointer"
                            aria-label="Copy code"
                          >
                            <FiCopy className="text-secondary-text text-base hover:text-primary-text transition-colors" />
                          </button>
                          <button
                            type="button"
                            onClick={handleRotateCode}
                            className="p-1.5 hover:bg-secondary-background rounded transition-colors cursor-pointer"
                            aria-label="Rotate code"
                          >
                            <FiRefreshCw className="text-secondary-text text-base hover:text-primary-text transition-colors" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-secondary-text text-xs mt-2">
                    Share this code with students to allow them to join the course. {isOwnerOrInstructor && 'You can rotate the code at any time to generate a new one.'}
                  </p>
                  </>
                  )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-primary-text text-lg font-semibold tracking-wide">Course Members</h2>
              <p className="text-secondary-text text-sm mt-1">
                {isStaff ? 'Manage students and instructors for this course' : 'View course members'}
              </p>
            </div>
            {isOwnerOrInstructor && !isArchived && (
              <button 
                onClick={() => setShowAddMemberModal(true)}
                className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-hover rounded-lg text-primary-text text-sm font-medium tracking-wide transition-colors"
              >
                + Add Member
              </button>
            )}
          </div>

          <div className="space-y-4">
            {members.length === 0 && (
              <div className="p-4 bg-secondary-background border-2 border-primary-border rounded-lg">
                <p className="text-secondary-text text-sm">No members in this course yet.</p>
              </div>
            )}
            {members.map((member) => {
              const displayName = member.user_first_name && member.user_last_name
                ? `${member.user_first_name} ${member.user_last_name}`
                : member.user_email || `User ${member.user_id.substring(0, 8)}`;
              const avatarLetter = member.user_first_name?.[0] || member.user_email?.[0] || member.user_id[0];
              
              const formatRole = (role: string) => {
                const roleMap: Record<string, string> = {
                  'OWNER': 'Owner',
                  'INSTRUCTOR': 'Instructor',
                  'TA': 'TA',
                  'STUDENT': 'Student'
                };
                return roleMap[role] || role;
              };
              
              const displayRole = userCourseRole === 'STUDENT' && member.role === 'OWNER'
                ? 'Instructor'
                : formatRole(member.role);
              
              return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-secondary-background border-2 border-primary-border rounded-lg hover:border-primary-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-accent flex items-center justify-center">
                    <span className="text-primary-text font-semibold text-sm">
                      {avatarLetter.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-primary-text font-semibold text-sm">{displayName}</h3>
                    <p className="text-secondary-text text-xs">{member.user_email || 'No email'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-secondary-text text-xs">{displayRole}</p>
                    <p className="text-secondary-text text-xs">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
                  </div>
                  {isOwnerOrInstructor && !isArchived && (
                    <button
                      onClick={() => openRemoveMemberModal(member)}
                      className="p-2 hover:bg-primary-background rounded transition-colors"
                      aria-label="Remove member"
                      disabled={member.role === 'OWNER'}
                    >
                      <FaTrash className={`text-sm transition-colors ${
                        member.role === 'OWNER' 
                          ? 'text-secondary-text/30 cursor-not-allowed' 
                          : 'text-secondary-text hover:text-primary-accent'
                      }`} />
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {isOwnerOrInstructor && activeTab === 'details' && (
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
    </>
  );
}
