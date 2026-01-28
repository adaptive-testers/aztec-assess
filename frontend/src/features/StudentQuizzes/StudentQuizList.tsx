export default function StudentQuizList() {
 let quizExists = false;

  return (
    <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9] px-4 py-4 md:py-6">
      <div className="flex w-full max-w-[887px] flex-col gap-4 md:gap-[26px]">
        {/* Page header */}
        <div className="flex flex-col items-start gap-[4px]">
          <h1 className="font-medium text-[26px] leading-[39px] tracking-[0px]">
            Class Name
          </h1>
          <p className="text-[17px] leading-[26px] tracking-[0px] text-[#A1A1AA]">
            Track all your assigned quizzes.
          </p>
        </div>

        {/* Card */}
        <div className="w-full rounded-[13px] border border-[#404040] bg-[#1A1A1A] shadow-[0_4px_6px_rgba(0,0,0,0.25)]">
          <div className="px-[26px] py-4">
            <p className="text-[#A1A1AA]">No quizzes available yet.</p>


          </div>
        </div>
      </div>
    </section>
  );
}