import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';

import { privateApi } from '../../api/axios';
import { AUTH, COURSES } from '../../api/endpoints';
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
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  role: 'OWNER' | 'INSTRUCTOR' | 'TA' | 'STUDENT';
  joined_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLE_RANK: Record<Member['role'], number> = {
  OWNER: 0,
  INSTRUCTOR: 1,
  TA: 2,
  STUDENT: 3,
};

function normalizeRole(role: string): Member['role'] {
  const upper = role.toUpperCase();
  if (upper === 'OWNER' || upper === 'INSTRUCTOR' || upper === 'TA' || upper === 'STUDENT') {
    return upper;
  }
  return 'STUDENT';
}

function roleLabel(role: string): string {
  const normalized = normalizeRole(role);
  const roleMap: Record<Member['role'], string> = {
    OWNER: 'Owner',
    INSTRUCTOR: 'Instructor',
    TA: 'TA',
    STUDENT: 'Student',
  };
  return roleMap[normalized];
}

function roleBadgeClass(role: string): string {
  const normalized = normalizeRole(role);
  if (normalized === 'OWNER' || normalized === 'INSTRUCTOR') {
    return 'bg-blue-500/20 text-blue-500 border border-blue-500/30';
  }
  if (normalized === 'TA') {
    return 'bg-purple-500/20 text-purple-500 border border-purple-500/30';
  }
  return 'bg-[#262626] text-[#A1A1AA] border border-[#404040]';
}

function studentTagLabel(role: string): string | null {
  const normalized = normalizeRole(role);
  if (normalized === 'OWNER' || normalized === 'INSTRUCTOR') return 'Instructor';
  if (normalized === 'TA') return 'TA';
  return null;
}

export default function StudentsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [resolvedCourseId, setResolvedCourseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userCourseRole, setUserCourseRole] = useState<'OWNER' | 'INSTRUCTOR' | 'TA' | 'STUDENT' | null>(null);

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
        setCourse(response.data);
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
        setMembers(response.data);
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
  }, [resolvedCourseId]);

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

  const refreshMembers = async () => {
    if (!resolvedCourseId) return;
    try {
      const response = await privateApi.get(COURSES.MEMBERS(resolvedCourseId));
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setToast({ message: 'Failed to load members', type: 'error' });
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

  const isStudent = userCourseRole === 'STUDENT';
  const isActive = course?.status === 'ACTIVE';
  const isArchived = course?.status === 'ARCHIVED';
  const isStaff = userCourseRole !== null && ['OWNER', 'INSTRUCTOR', 'TA'].includes(userCourseRole);
  const isOwnerOrInstructor = userCourseRole !== null && ['OWNER', 'INSTRUCTOR'].includes(userCourseRole);
  const sortedMembers = useMemo(() => {
    const getDisplayName = (member: Member) =>
      (member.user_first_name && member.user_last_name
        ? `${member.user_first_name} ${member.user_last_name}`
        : member.user_email || `User ${member.user_id.substring(0, 8)}`).trim();

    return [...members].sort((a, b) => {
      const byRole = ROLE_RANK[normalizeRole(a.role)] - ROLE_RANK[normalizeRole(b.role)];
      if (byRole !== 0) return byRole;
      return getDisplayName(a).toLowerCase().localeCompare(getDisplayName(b).toLowerCase());
    });
  }, [members]);

  return (
    <section className="min-h-screen w-full bg-[#0A0A0A] text-[#F1F5F9] geist-font">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 sm:px-6 lg:px-10">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Modals */}
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
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <button
              type="button"
              onClick={() => {
                setShowAddMemberModal(false);
                setMemberEmail('');
              }}
              aria-label="Close modal backdrop"
              className="absolute inset-0 cursor-default bg-black/60"
            />
            
            <div className="relative z-10 w-full max-w-[420px] rounded-[8px] border border-[#404040] bg-[#1A1A1A] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]">
              <div className="flex h-[61px] items-center justify-between border-b border-[#404040] px-4">
                <h2 className="text-[16px] font-medium leading-[24px] text-[#F1F5F9]">
                  Add Member
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setMemberEmail('');
                  }}
                  aria-label="Close"
                  className="grid h-7 w-7 place-items-center rounded-[6px] text-[#A1A1AA] hover:bg-white/5"
                >
                  <FiX className="h-4 w-4" />
                </button>
              </div>
              
              <div className="px-5 py-5 flex flex-col gap-4">
                {course?.status === 'DRAFT' && (
                  <div className="px-4 py-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-500 text-[13px]">
                      This course is in draft status. Members will be added but won&apos;t be able to access the course until it&apos;s activated.
                    </p>
                  </div>
                )}
                <div>
                  <label htmlFor="member-email-input" className="mb-2 block text-[14px] font-medium leading-[21px] text-[#F1F5F9]">
                    Email Address <span className="text-[#F87171]">*</span>
                  </label>
                  <input
                    id="member-email-input"
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="h-[42px] w-full rounded-[6px] border border-[#404040] bg-[#262626] px-3 text-[14px] leading-[21px] text-[#F1F5F9] outline-none placeholder:text-[#A1A1AA] focus:border-[#F87171]/60"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && memberEmail.trim()) {
                        handleAddMember();
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="flex h-[56px] items-center justify-end gap-3 border-t border-[#404040] px-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setMemberEmail('');
                  }}
                  className="h-[33px] rounded-[6px] border border-[#404040] px-3 text-[13px] font-medium leading-[20px] text-[#F1F5F9] hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMember}
                  disabled={!memberEmail.trim() || isAddingMember}
                  className={`h-[33px] rounded-[6px] px-3 text-[13px] font-medium leading-[20px] text-white bg-[#F87171] transition border border-transparent ${
                    !memberEmail.trim() || isAddingMember
                      ? "opacity-70 cursor-not-allowed"
                      : "hover:bg-[#EF6262]"
                  }`}
                >
                  {isAddingMember ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          {isLoading ? (
            <div className="flex items-center gap-4 w-full">
              <div className="skeleton-shimmer h-9 w-48 rounded" />
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <h1 className="text-[24px] font-normal leading-9 tracking-[0.0703px] text-[#F1F5F9] truncate">
                  {course?.title ?? 'Course'}
                </h1>
                {course && isStaff && (
                  <span className={`inline-block px-3 py-1 rounded-md text-[13px] font-semibold tracking-wide ${
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
            </div>
          )}
        </div>

        {/* Top nav */}
        {effectiveCourseId && (
          <div className="mt-4 mb-6 rounded-2xl border border-[#404040] bg-gradient-to-b from-[#1A1A1A] via-[#1F1F1F] to-[#1A1A1A] p-1 shadow-[0px_4px_12px_rgba(0,0,0,0.3)]">
            {isLoading && userCourseRole === null ? (
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-[#232323]" />
                ))}
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => navigate(`/courses/${effectiveCourseId}`)}
                className="h-12 rounded-xl text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#A1A1AA] hover:bg-[#151515] transition"
              >
                Quizzes
              </button>
              <button
                type="button"
                className="h-12 rounded-xl bg-[#F87171] text-[16px] font-normal leading-6 tracking-[-0.3125px] text-white shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]"
              >
                Members
              </button>
              <button
                type="button"
                className="h-12 rounded-xl text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#A1A1AA] hover:bg-[#151515] transition"
              >
                Grades
              </button>
              <button
                type="button"
                onClick={() => navigate(`/courses/${effectiveCourseId}/settings`)}
                className="h-12 rounded-xl text-[16px] font-normal leading-6 tracking-[-0.3125px] text-[#A1A1AA] hover:bg-[#151515] transition"
              >
                Course Info
              </button>
            </div>
            )}
          </div>
        )}

        {/* Members List Section */}
        <div className="space-y-6">

          {isStudent ? (
            <div className="space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#404040] rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="skeleton-shimmer w-10 h-10 rounded-full" />
                        <div className="flex flex-col gap-2">
                          <div className="skeleton-shimmer h-[20px] w-32 rounded" />
                          <div className="skeleton-shimmer h-[16px] w-48 rounded" />
                        </div>
                      </div>
                      <div className="skeleton-shimmer h-[16px] w-16 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {members.length === 0 ? (
                    <div className="p-4 bg-[#1A1A1A] border border-[#404040] rounded-lg">
                      <p className="text-[#A1A1AA] text-sm">No members in this course yet.</p>
                    </div>
                  ) : (
                    sortedMembers.map((member) => {
                      const displayName = member.user_first_name && member.user_last_name
                        ? `${member.user_first_name} ${member.user_last_name}`
                        : member.user_email || `User ${member.user_id.substring(0, 8)}`;
                      const avatarLetter = member.user_first_name?.[0] || member.user_email?.[0] || member.user_id[0];
                      const normalizedRole = normalizeRole(member.role);
                      const isStaffMember = ['OWNER', 'INSTRUCTOR', 'TA'].includes(normalizedRole);
                      const studentVisibleTag = studentTagLabel(member.role);
                      return (
                        <div
                          key={member.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#1A1A1A] border border-[#404040] rounded-lg gap-4 transition-colors hover:border-[#F87171]/50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#404040] flex items-center justify-center shrink-0">
                              <span className="text-[#F1F5F9] font-medium text-sm">
                                {avatarLetter.toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-[#F1F5F9] font-medium text-[15px] truncate">{displayName}</h3>
                                {studentVisibleTag && (
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${roleBadgeClass(member.role)}`}>
                                    {studentVisibleTag}
                                  </span>
                                )}
                              </div>
                              {isStaffMember && member.user_email && (
                                <p className="text-[#A1A1AA] text-[13px] mt-0.5 truncate">{member.user_email}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[#A1A1AA] text-sm mt-1">
                    {isStaff ? 'Manage students and instructors for this course' : 'View course members'}
                  </p>
                </div>
                {isOwnerOrInstructor && !isArchived && (
                  <button 
                    onClick={() => setShowAddMemberModal(true)}
                    className="px-4 py-2 bg-[#F87171] hover:bg-[#FCA5A5] rounded-lg text-white text-sm font-medium tracking-wide transition-colors"
                  >
                    + Add Member
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-[#1A1A1A] border border-[#404040] rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="skeleton-shimmer w-10 h-10 rounded-full" />
                          <div className="flex flex-col gap-2">
                            <div className="skeleton-shimmer h-[20px] w-32 rounded" />
                            <div className="skeleton-shimmer h-[16px] w-48 rounded" />
                          </div>
                        </div>
                        <div className="skeleton-shimmer h-[16px] w-16 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {members.length === 0 && (
                      <div className="p-4 bg-[#1A1A1A] border border-[#404040] rounded-lg">
                        <p className="text-[#A1A1AA] text-sm">No members in this course yet.</p>
                      </div>
                    )}
                    {sortedMembers.map((member) => {
                      const displayName = member.user_first_name && member.user_last_name
                        ? `${member.user_first_name} ${member.user_last_name}`
                        : member.user_email || `User ${member.user_id.substring(0, 8)}`;
                      const avatarLetter = member.user_first_name?.[0] || member.user_email?.[0] || member.user_id[0];
                      
                      const normalizedRole = normalizeRole(member.role);

                      const canRemove = isOwnerOrInstructor && 
                        normalizedRole !== 'OWNER' && 
                        member.user_id !== currentUserId;

                      return (
                        <div
                          key={member.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#1A1A1A] border border-[#404040] rounded-lg gap-4 transition-colors hover:border-[#F87171]/50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#404040] flex items-center justify-center shrink-0">
                              <span className="text-[#F1F5F9] font-medium text-sm">
                                {avatarLetter.toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-[#F1F5F9] font-medium text-[15px] truncate">
                                  {displayName}
                                </h3>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${roleBadgeClass(member.role)}`}>
                                  {roleLabel(member.role)}
                                </span>
                              </div>
                              {member.user_email && (
                                <p className="text-[#A1A1AA] text-[13px] mt-0.5 truncate">
                                  {member.user_email}
                                </p>
                              )}
                              <p className="text-[#A1A1AA] text-xs mt-1">
                                Joined {new Date(member.joined_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          
                          {canRemove && (
                            <button
                              onClick={() => {
                                setMemberToRemove(member);
                                setShowRemoveMemberModal(true);
                              }}
                              className="self-end sm:self-center px-3 py-1.5 text-xs font-medium text-[#EF6262] hover:bg-[#EF6262]/10 rounded border border-transparent hover:border-[#EF6262]/20 transition-all whitespace-nowrap"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
