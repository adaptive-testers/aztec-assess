export default function StudentDashboardPage() {
 return <>
 <div className="grid grid-rows-[auto_auto_1fr_1fr] grid-cols-2 min-h-screen w-full gap-4 px-6 py-6">

    <div className="row-span-1 col-span-2 text-primary-text">
        Welcome back student!
        Here's whats happening in your courses.
    </div>
    

    <div className="row-span-1 col-span-2 text-primary-text h-48">
        Calendar placeholder 
    </div>

    <div className="flex flex-col row-span-2 col-span-1 bg-secondary-background w-full h-full border-2 border-primary-border rounded-2xl p-6 gap-8">
       
        <div className="text-primary-text"> 
            Performance Overview
        </div>
        
        <div className="flex flex-col">
        
            <div className="flex flex-row justify-between">
                <div className="text-secondary-text"> 
                Overall Average
                </div>
                <div className="text-primary-text">
                    85%
                </div>

             </div>

            <div className="text-primary-text">
             Progress bar placeholder
            </div>
        </div>

        <div className="flex flex-col">
        
            <div className="flex flex-row justify-between">
                <div className="text-secondary-text"> 
                Quizzes Completed
                </div>
                <div className="text-primary-text">
                    12/15
                </div>

             </div>

            <div className="text-primary-text">
             Progress bar placeholder
            </div>
        </div>


        <div className="flex flex-col">
        
            <div className="flex flex-row justify-between">
                <div className="text-secondary-text"> 
                Course Progress
                </div>
                <div className="text-primary-text">
                    60%
                </div>

             </div>

            <div className="text-primary-text">
             Progress bar placeholder
            </div>
        </div>
    </div>

 
    <div className="row-span-2 col-span-1 bg-secondary-background w-full h-full border-2 border-primary-border rounded-2xl p-6">
        <div className="text-primary-text"> 
            Upcoming Quizzes
        </div>
    </div>

   
    <div className="row-span-1 col-span-2 bg-secondary-background w-full h-full border-2 border-primary-border rounded-2xl p-6">
        <div className="text-primary-text"> 
            Recent Quiz History
        </div>
    </div>
 </div>
 </>
}
