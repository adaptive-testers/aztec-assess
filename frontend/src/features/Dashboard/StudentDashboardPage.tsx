import { Progress } from '@mantine/core';
import { useEffect, useState } from 'react';
import { privateApi } from '../../api/axios';
import { AUTH } from '../../api/endpoints';

interface UserProfile {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export default function StudentDashboardPage() {
  const [userName, setUserName] = useState<string>('student');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await privateApi.get(AUTH.PROFILE);
        const profile: UserProfile = response.data;
        if (profile.first_name) {
          setUserName(profile.first_name);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfile();
  }, []);
 return <>
 <div className="grid grid-rows-[auto_auto_1fr_1fr] grid-cols-2 min-h-screen w-full gap-4 geist-font">

    <div className="row-span-1 col-span-2 text-primary-text flex flex-col">
       <div className="tracking-wider font-medium text-3xl">Welcome Back, {userName}!</div>
       <div className="tracking-wide text-secondary-text text-lg"> Here's what's happening in your courses.</div>
    </div>
    

    <div className="row-span-1 col-span-2 text-primary-text h-48 bg-secondary-background border-2 border-primary-border rounded-2xl flex items-center justify-center">
        Calendar placeholder 
    </div>

    <div className="flex flex-col row-span-2 col-span-1 bg-secondary-background w-full h-full border-2 border-primary-border rounded-2xl p-6 gap-8">
       
        <div className="text-primary-text text-xl font-semibold tracking-wide"> 
            Performance Overview
        </div>
        
        <div className="flex flex-col gap-1">
        
            <div className="flex flex-row justify-between items-center">
                <div className="text-secondary-text text-sm font-medium tracking-wide"> 
                Overall Average
                </div>
                <div className="text-primary-text text-lg font-bold">
                    85%
                </div>

             </div>

            <div className="text-primary-text">
                <Progress value={80} color="green" size="md" bg="#262626" className="w-full" />
            </div>
        </div>

        <div className="flex flex-col gap-1">
        
            <div className="flex flex-row justify-between items-center">
                <div className="text-secondary-text text-sm font-medium tracking-wide"> 
                Quizzes Completed
                </div>
                <div className="text-primary-text text-lg font-bold">
                    12/15
                </div>

             </div>

            <div className="text-primary-text">
                <Progress value={80} color="red" size="md" bg="#262626" className="w-full" />
            </div>
        </div>


        <div className="flex flex-col gap-1">
        
            <div className="flex flex-row justify-between items-center">
                <div className="text-secondary-text text-sm font-medium tracking-wide"> 
                Course Progress
                </div>
                <div className="text-primary-text text-lg font-bold">
                    60%
                </div>

             </div>

            <div className="text-primary-text">
                <Progress value={60} color="grape" size="md" bg="#262626" className="w-full" />
            </div>
        </div>
    </div>

 
    <div className="row-span-2 col-span-1 bg-secondary-background w-full h-full border-2 border-primary-border rounded-2xl p-6">
        <div className="flex flex-col gap-7">
        <div className="flex flex-row justify-between items-center">
            <div className="text-primary-text text-xl font-semibold tracking-wide"> 
                Upcoming Quizzes
            </div>
            <div className="text-secondary-text text-sm font-medium"> 
                day placeholder
            </div>
        </div>
        <div className="bg-secondary-background w-full h-full border-2 border-primary-border rounded-2xl">
            <div className="flex flex-col gap-2 p-4">
                <div className="text-primary-text text-lg font-semibold">
                    Class 101
                </div>
                <div className="text-secondary-text text-sm font-medium">
                    Chapter 1 Placeholder Quiz
                </div>
                <div className="p-2 text-primary-text text-xs px-3 py-1.5 tracking-wide font-medium bg-secondary-background border-2 border-primary-border rounded-md w-fit mt-2">
                    Due 01/01/2001
                </div>
            </div>
        </div>
        </div>
    </div>

   
    <div className="row-span-1 col-span-2 bg-secondary-background w-full h-full border-2 border-primary-border rounded-2xl p-6">
        <div className="flex flex-col gap-7">
            <div className="text-primary-text text-xl font-semibold tracking-wide"> 
                Recent Quiz History
            </div>
        <div className="bg-secondary-background w-full h-full border-2 border-primary-border rounded-2xl">
            <div className="flex justify-between p-4 items-center">
            <div className="flex flex-col gap-1.5 p-2">
                <div className="text-primary-text text-lg font-semibold">
                    Chapter 0 Placeholder Quiz
                </div>
                <div className="text-secondary-text text-sm font-medium">
                    Class 101
                </div>
                <div className="text-secondary-text text-sm">
                    Completed 01/01/2001
                </div>
            </div>
            <div className="flex flex-col justify-center items-end gap-3">
                <div className="text-green-500 text-2xl font-bold">
                    85%
                </div>
                <div className="bg-secondary-background border-2 border-primary-border rounded-md text-primary-text text-xs px-4 py-1.5 tracking-wide font-semibold">
                    Excellent
                </div>
            </div>
            </div>
        </div>
        </div>
    </div>


 </div>
 </>
}