import { useEffect, useState } from 'react';

import { privateApi } from '../../api/axios';
import { AUTH } from '../../api/endpoints';

import InstructorDashboardPage from './InstructorDashboardPage';
import StudentDashboardPage from './StudentDashboardPage';

interface UserProfile {
  role: 'student' | 'instructor' | 'admin';
  first_name?: string;
}

export default function DashboardPage() {
  const [role, setRole] = useState<UserProfile['role'] | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        const res = await privateApi.get<UserProfile>(AUTH.PROFILE);
        if (mounted) {
          setRole(res.data.role);
          setUserName(res.data.first_name || '');
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        if (mounted) {
          setRole('student');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-primary-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full border-4 border-[#2A2A2A]" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#EF6262]" />
          </div>
          <div className="text-sm text-[#8E8E8E]">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (role === 'instructor' || role === 'admin') {
    return <InstructorDashboardPage userName={userName} />;
  }

  return <StudentDashboardPage userName={userName} />;
}
