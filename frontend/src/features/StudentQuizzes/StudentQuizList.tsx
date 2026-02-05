export default function StudentQuizList() {
 let quizExists = false;

  return (
    <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9]">
      <div className="flex w-full w-full flex-col gap-4 md:gap-[26px]">
        {/* Page header */}
        <div className="flex flex-col items-start gap-[4px]">
          <h1 className="font-medium text-[26px] leading-[39px] tracking-wider">
            Class Name
          </h1>
          <p className="text-[17px] leading-[26px] tracking-[0px] text-[#A1A1AA]">
            Track all your quizzes.
          </p>
        </div>

        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="px-[26px] py-4">
            <p className="text-[#A1A1AA]">No quizzes available yet.</p>

            {/*Quiz*/}
            <div className="flex justify-between align- p-3 rounded-[7px] border border-[2px] border-[#404040] bg-[#1A1A1A]">
              {/* Quiz info/status*/}
              <div>
                <div className="flex">
                  <div>
                    <p>Status</p>
                  </div>

                  <div className="flex flex-col text-[13px]">
                    <div>
                      <p className="text-[15px]">Quiz Title</p>
                    </div>
                    <div>
                      <div><p>Start Date</p></div>
                      <div><p>Due Date</p></div>
                      
                    </div>
                    
                  </div>
                </div>

              </div>

              {/* Quiz actions*/}
              <div>
                <p>Results/Start</p>

              </div>
                
            </div>


          </div>
        </div>
      </div>
    </section>
  );
}