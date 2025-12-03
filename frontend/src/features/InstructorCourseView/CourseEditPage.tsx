import axios from 'axios';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { FiEye, FiEyeOff, FiCopy, FiRefreshCw } from 'react-icons/fi';
import { FaTrash } from 'react-icons/fa';
import { privateApi } from '../../api/axios';
import { Toast } from '../../components/Toast';

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
  role: 'OWNER' | 'INSTRUCTOR' | 'TA' | 'STUDENT';
  joined_at: string;
}

interface UserDetails {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface FormFields {
  title: string;
}

export default function CourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormFields>();
  
  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userDetails, setUserDetails] = useState<Record<string, UserDetails>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourseData();
      fetchMembers();
    }
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      const response = await privateApi.get(`/courses/${courseId}/`);
      const courseData: Course = response.data;
      setCourse(courseData);
      setValue('title', courseData.title);
    } catch (error) {
      console.error('Failed to fetch course:', error);
      setToast({ message: 'Failed to load course data', type: 'error' });
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await privateApi.get(`/courses/${courseId}/members/`);
      const membersData: Member[] = response.data;
      setMembers(membersData);
      
      // Fetch user details for each member
      const userDetailsMap: Record<string, UserDetails> = {};
      for (const member of membersData) {
        try {
          const userResponse = await privateApi.get(`/auth/users/${member.user_id}/`);
          userDetailsMap[member.user_id] = userResponse.data;
        } catch (error) {
          console.error(`Failed to fetch user details for ${member.user_id}:`, error);
        }
      }
      setUserDetails(userDetailsMap);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setToast({ message: 'Failed to load members', type: 'error' });
    }
  };

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    if (!courseId) return;
    
    try {
      await privateApi.patch(`/courses/${courseId}/`, {
        title: data.title,
      });
      await fetchCourseData();
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
    if (!courseId) return;
    
    try {
      await privateApi.post(`/courses/${courseId}/activate/`);
      await fetchCourseData();
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

  const handleCopyCode = () => {
    if (course?.join_code) {
      navigator.clipboard.writeText(course.join_code);
      setToast({ message: 'Join code copied to clipboard', type: 'success' });
    }
  };

  const handleRotateCode = async () => {
    if (!courseId) return;
    
    try {
      const response = await privateApi.post(`/courses/${courseId}/rotate-join-code/`);
      setCourse(prev => prev ? { ...prev, join_code: response.data.join_code } : null);
      setToast({ message: 'Join code rotated successfully', type: 'success' });
    } catch (error) {
      console.error('Failed to rotate join code:', error);
      setToast({ message: 'Failed to rotate join code', type: 'error' });
    }
  };

  const handleToggleJoinCode = async () => {
    if (!courseId || !course) return;
    
    try {
      const endpoint = course.join_code_enabled 
        ? `/courses/${courseId}/join-code/disable/`
        : `/courses/${courseId}/join-code/enable/`;
      
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

  const handleRemoveMember = async (userId: string) => {
    if (!courseId) return;
    
    try {
      await privateApi.post(`/courses/${courseId}/members/remove/`, {
        user_id: userId
      });
      await fetchMembers();
      setToast({ message: 'Member removed successfully', type: 'success' });
    } catch (error) {
      console.error('Failed to remove member:', error);
      setToast({ message: 'Failed to remove member', type: 'error' });
    }
  };

  const handleAddMember = async () => {
    // TODO: Implement add member modal/form
    const email = prompt('Enter member email:');
    if (!email || !courseId) return;
    
    try {
      await privateApi.post(`/courses/${courseId}/members/add/`, {
        email,
        role: 'STUDENT'
      });
      await fetchMembers();
      setToast({ message: 'Member added successfully', type: 'success' });
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
    }
  };

  const isActive = course?.status === 'ACTIVE';

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-primary-text text-2xl font-medium tracking-wide">Edit Course</h1>
          <p className="text-secondary-text text-sm mt-1">Configure your course settings and manage members</p>
        </div>
        <div className="flex gap-3">
          <button 
            type="submit"
            form="course-edit-form"
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-lg text-sm font-medium tracking-wide transition-colors ${
              isSubmitting
                ? 'bg-secondary-background border-2 border-primary-border text-primary-text opacity-70 cursor-not-allowed'
                : 'bg-secondary-background border-2 border-primary-border text-primary-text hover:bg-secondary-accent-hover cursor-pointer'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button 
            onClick={handleActivateCourse}
            disabled={isActive}
            className={`px-6 py-2 rounded-lg text-primary-text text-sm font-medium tracking-wide transition-colors ${
              isActive 
                ? 'bg-primary-accent opacity-50 cursor-not-allowed' 
                : 'bg-primary-accent hover:bg-primary-accent-hover cursor-pointer'
            }`}
          >
            {isActive ? 'Course Active' : 'Activate Course'}
          </button>
        </div>
      </div>

      {/* Status Badge */}
      {course && (
        <div className="mb-6">
          <span className={`inline-block px-3 py-1 rounded-md text-xs font-semibold tracking-wide ${
            isActive 
              ? 'bg-green-500/20 text-green-500 border border-green-500/30' 
              : 'bg-secondary-background text-secondary-text border-2 border-primary-border'
          }`}>
            {course.status}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-primary-border mb-6">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('details')}
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
            onClick={() => setActiveTab('members')}
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

      {/* Tab Content */}
      {activeTab === 'details' ? (
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#404040] px-[26px] py-4 md:py-[22px]">
              <h2 className="text-[17px] leading-[17px] tracking-[0px] text-[#F1F5F9]">
                Course Information
              </h2>
            </div>
            
            <form id="course-edit-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 md:gap-[26px] px-[26px] py-4 md:py-[26px]">
              {/* Course Title */}
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
              </div>
            </form>
          </div>

          {/* Join Code */}
          <div className="bg-secondary-background border-2 border-primary-border rounded-2xl p-6">
            <h2 className="text-primary-text text-lg font-semibold tracking-wide mb-2">Join Code</h2>
            <p className="text-secondary-text text-sm mb-4">
              Allow students to join using a course code
            </p>
            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={handleToggleJoinCode}
                disabled={!isActive}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  course?.join_code_enabled
                    ? 'bg-primary-accent hover:bg-primary-accent-hover text-primary-text cursor-pointer'
                    : isActive
                      ? 'bg-secondary-background border-2 border-primary-border text-secondary-text hover:bg-secondary-accent-hover cursor-pointer'
                      : 'bg-secondary-background border-2 border-primary-border text-secondary-text opacity-50 cursor-not-allowed'
                }`}
              >
                {course?.join_code_enabled ? 'Disable' : 'Enable'} Join Code
              </button>
              {!isActive && (
                <p className="text-secondary-text text-xs">Course must be active to enable join code</p>
              )}
            </div>
            {course?.join_code_enabled && course?.join_code && (
            <>
            <div className="inline-flex items-center gap-2 px-4 py-3 bg-primary-background border-2 border-primary-border rounded-lg">
              <span className="px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide bg-green-500/20 text-green-500">
                Enabled
              </span>
              <div className="flex items-center gap-3 ml-2">
                <span className="text-primary-text font-mono text-sm">
                  {showJoinCode ? course?.join_code : '••••••'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowJoinCode(!showJoinCode)}
                  className="p-1.5 hover:bg-secondary-background rounded transition-colors cursor-pointer"
                  aria-label={showJoinCode ? 'Hide code' : 'Show code'}
                >
                  {showJoinCode ? (
                    <FiEyeOff className="text-secondary-text text-base hover:text-primary-text transition-colors" />
                  ) : (
                    <FiEye className="text-secondary-text text-base hover:text-primary-text transition-colors" />
                  )}
                </button>
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
              </div>
            </div>
            <p className="text-secondary-text text-xs mt-2">
              Share this code with students to allow them to join the course. You can rotate the code at any time to generate a new one.
            </p>
            </>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Members Tab */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-primary-text text-lg font-semibold tracking-wide">Course Members</h2>
              <p className="text-secondary-text text-sm mt-1">Manage students and instructors for this course</p>
            </div>
            <button 
              onClick={handleAddMember}
              className="px-4 py-2 bg-primary-accent hover:bg-primary-accent-hover rounded-lg text-primary-text text-sm font-medium tracking-wide transition-colors"
            >
              + Add Member
            </button>
          </div>

          {/* Members List */}
          <div className="space-y-4">
            {members.map((member) => {
              const user = userDetails[member.user_id];
              const displayName = user 
                ? (user.first_name && user.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user.email)
                : `User ${member.user_id.substring(0, 8)}`;
              const avatarLetter = user?.first_name?.[0] || user?.email?.[0] || member.user_id[0];
              
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
                    <p className="text-secondary-text text-xs">{user?.email || 'Loading...'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-secondary-text text-xs">{member.role}</p>
                    <p className="text-secondary-text text-xs">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
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
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
