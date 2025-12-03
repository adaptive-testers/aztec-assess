import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiEye, FiEyeOff, FiCopy, FiRefreshCw } from 'react-icons/fi';
import { FaTrash } from 'react-icons/fa';
import { privateApi } from '../../api/axios';

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
  // TODO: Add user details when available from API
}

export default function CourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  
  // Form state - TODO: Expand when backend supports additional fields
  const [courseData, setCourseData] = useState({
    title: '',
    // Placeholder fields for future implementation
    courseCode: '',
    instructorName: '',
    duration: '',
    maxStudents: '',
    description: ''
  });

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
      setCourseData(prev => ({
        ...prev,
        title: courseData.title,
      }));
    } catch (error) {
      console.error('Failed to fetch course:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await privateApi.get(`/courses/${courseId}/members/`);
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const handleSaveCourse = async () => {
    if (!courseId) return;
    
    try {
      await privateApi.patch(`/courses/${courseId}/`, {
        title: courseData.title,
        // TODO: Add other fields when backend supports them
      });
      fetchCourseData();
      alert('Course updated successfully');
    } catch (error) {
      console.error('Failed to update course:', error);
      alert('Failed to update course');
    }
  };

  const handleActivateCourse = async () => {
    if (!courseId) return;
    
    try {
      await privateApi.post(`/courses/${courseId}/activate/`);
      fetchCourseData();
      alert('Course activated successfully');
    } catch (error) {
      console.error('Failed to activate course:', error);
      alert('Failed to activate course');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setCourseData(prev => ({ ...prev, [field]: value }));
  };

  const handleCopyCode = () => {
    if (course?.join_code) {
      navigator.clipboard.writeText(course.join_code);
      alert('Join code copied to clipboard');
    }
  };

  const handleRotateCode = async () => {
    if (!courseId) return;
    
    try {
      const response = await privateApi.post(`/courses/${courseId}/rotate-join-code/`);
      setCourse(prev => prev ? { ...prev, join_code: response.data.join_code } : null);
      alert('Join code rotated successfully');
    } catch (error) {
      console.error('Failed to rotate join code:', error);
      alert('Failed to rotate join code');
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
    } catch (error) {
      console.error('Failed to toggle join code:', error);
      alert('Failed to toggle join code');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!courseId) return;
    
    try {
      await privateApi.post(`/courses/${courseId}/members/remove/`, {
        user_id: userId
      });
      fetchMembers();
      alert('Member removed successfully');
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
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
      fetchMembers();
      alert('Member added successfully');
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member');
    }
  };

  const isActive = course?.status === 'ACTIVE';
  const isDraft = course?.status === 'DRAFT';

  return (
    <div className="min-h-screen w-full p-6 geist-font bg-primary-background">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-primary-text text-2xl font-medium tracking-wide">Edit Course</h1>
          <p className="text-secondary-text text-sm mt-1">Configure your course settings and manage members</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSaveCourse}
            className="px-6 py-2 bg-secondary-background border-2 border-primary-border rounded-lg text-primary-text text-sm font-medium tracking-wide hover:bg-secondary-accent-hover transition-colors"
          >
            Save Changes
          </button>
          <button 
            onClick={handleActivateCourse}
            className={`px-6 py-2 rounded-lg text-primary-text text-sm font-medium tracking-wide transition-colors ${
              isActive 
                ? 'bg-primary-accent hover:bg-primary-accent-hover' 
                : 'bg-secondary-background border-2 border-primary-border hover:bg-secondary-accent-hover opacity-50 cursor-not-allowed'
            }`}
            disabled={isActive}
          >
            Activate Course
          </button>
        </div>
      </div>

      {/* Requirements Alert */}
      {isDraft && (
        <div className="bg-secondary-background border-2 border-primary-border rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="text-yellow-500 text-xl mt-0.5">⚠</div>
            <div>
              <h3 className="text-primary-text font-semibold text-sm mb-2">Requirements before activation:</h3>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-secondary-text text-sm">Complete all basic course information</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="text-secondary-text text-sm">Add at least one module</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <div className="bg-secondary-background border-2 border-primary-border rounded-2xl p-6">
            <h2 className="text-primary-text text-lg font-semibold tracking-wide mb-4">Basic Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-secondary-text text-sm font-medium mb-2">Course Code</label>
                <input
                  type="text"
                  value={courseData.courseCode}
                  onChange={(e) => handleInputChange('courseCode', e.target.value)}
                  className="w-full px-4 py-2.5 bg-primary-background border-2 border-primary-border rounded-lg text-primary-text text-sm focus:border-primary-accent focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-secondary-text text-sm font-medium mb-2">Course Title</label>
                <input
                  type="text"
                  value={courseData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-2.5 bg-primary-background border-2 border-primary-border rounded-lg text-primary-text text-sm focus:border-primary-accent focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-secondary-text text-sm font-medium mb-2">Instructor Name</label>
                <input
                  type="text"
                  value={courseData.instructorName}
                  onChange={(e) => handleInputChange('instructorName', e.target.value)}
                  className="w-full px-4 py-2.5 bg-primary-background border-2 border-primary-border rounded-lg text-primary-text text-sm focus:border-primary-accent focus:outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-secondary-text text-sm font-medium mb-2">Duration (weeks)</label>
                  <input
                    type="text"
                    value={courseData.duration}
                    onChange={(e) => handleInputChange('duration', e.target.value)}
                    className="w-full px-4 py-2.5 bg-primary-background border-2 border-primary-border rounded-lg text-primary-text text-sm focus:border-primary-accent focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-secondary-text text-sm font-medium mb-2">Max Students</label>
                  <input
                    type="text"
                    value={courseData.maxStudents}
                    onChange={(e) => handleInputChange('maxStudents', e.target.value)}
                    className="w-full px-4 py-2.5 bg-primary-background border-2 border-primary-border rounded-lg text-primary-text text-sm focus:border-primary-accent focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-secondary-text text-sm font-medium mb-2">Course Description</label>
              <textarea
                value={courseData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 bg-primary-background border-2 border-primary-border rounded-lg text-primary-text text-sm focus:border-primary-accent focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>

          {/* Join Code */}
          <div className="bg-secondary-background border-2 border-primary-border rounded-2xl p-6">
            <h2 className="text-primary-text text-lg font-semibold tracking-wide mb-2">Join Code</h2>
            <p className="text-secondary-text text-sm mb-4">
              Allow students to join using a course code
            </p>
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={handleToggleJoinCode}
                disabled={!isActive}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  course?.join_code_enabled
                    ? 'bg-primary-accent hover:bg-primary-accent-hover text-primary-text'
                    : 'bg-secondary-background border-2 border-primary-border text-secondary-text hover:bg-secondary-accent-hover'
                } ${!isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {course?.join_code_enabled ? 'Disable' : 'Enable'} Join Code
              </button>
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
                  onClick={() => setShowJoinCode(!showJoinCode)}
                  className="p-1.5 hover:bg-secondary-background rounded transition-colors"
                  aria-label={showJoinCode ? 'Hide code' : 'Show code'}
                >
                  {showJoinCode ? (
                    <FiEyeOff className="text-secondary-text text-base" />
                  ) : (
                    <FiEye className="text-secondary-text text-base" />
                  )}
                </button>
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 hover:bg-secondary-background rounded transition-colors"
                  aria-label="Copy code"
                >
                  <FiCopy className="text-secondary-text text-base" />
                </button>
                <button
                  onClick={handleRotateCode}
                  className="p-1.5 hover:bg-secondary-background rounded transition-colors"
                  aria-label="Rotate code"
                >
                  <FiRefreshCw className="text-secondary-text text-base" />
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
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-secondary-background border-2 border-primary-border rounded-lg hover:border-primary-accent/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-accent flex items-center justify-center">
                    <span className="text-primary-text font-semibold text-sm">
                      {member.user_id.substring(0, 1).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-primary-text font-semibold text-sm">User {member.user_id.substring(0, 8)}</h3>
                    <p className="text-secondary-text text-xs">TODO: Fetch user details</p>
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
