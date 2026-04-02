/**
 * Skeleton loader that matches the dashboard layout (StudentQuizList-aligned cards).
 */
export default function DashboardSkeleton({ userName }: { userName: string }) {
  const card =
    'rounded-xl border-2 border-primary-border bg-secondary-background shadow-[0px_4px_12px_rgba(0,0,0,0.45)] p-5 sm:p-6';
  const row =
    'rounded-lg border-2 border-primary-border bg-secondary-background p-4';

  return (
    <div className="geist-font flex min-h-0 w-full flex-1 flex-col gap-6 text-[#F1F5F9]">
      <div className="shrink-0">
        <h1 className="text-[24px] font-normal leading-9 tracking-[0.0703px] text-[#F1F5F9]/25">
          Welcome back, {userName}
        </h1>
        <div className="skeleton-shimmer mt-2 h-5 w-[min(100%,20rem)] rounded bg-[#2A2A2A]" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <div className={`flex flex-col gap-4 ${card}`}>
          <div className="skeleton-shimmer h-7 w-40 rounded bg-[#2A2A2A]" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex flex-row justify-between">
                <div className="skeleton-shimmer h-4 w-28 rounded bg-[#2A2A2A]" />
                <div className="skeleton-shimmer h-4 w-10 rounded bg-[#2A2A2A]" />
              </div>
              <div className="skeleton-shimmer h-2 w-full rounded bg-[#2A2A2A]" />
            </div>
          ))}
        </div>

        <div className={`flex flex-col gap-3 ${card}`}>
          <div className="flex flex-row justify-between">
            <div className="skeleton-shimmer h-7 w-36 rounded bg-[#2A2A2A]" />
            <div className="skeleton-shimmer h-4 w-16 rounded bg-[#2A2A2A]" />
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={row}>
                <div className="flex flex-col gap-2">
                  <div className="skeleton-shimmer h-4 w-32 rounded bg-[#2A2A2A]" />
                  <div className="skeleton-shimmer h-3 w-24 rounded bg-[#2A2A2A]" />
                  <div className="skeleton-shimmer mt-1 h-6 w-24 rounded-md bg-[#2A2A2A]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`flex flex-col gap-3 ${card}`}>
        <div className="skeleton-shimmer h-7 w-48 rounded bg-[#2A2A2A]" />
        <div className="mt-3 flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div key={i} className={`flex justify-between gap-4 ${row}`}>
              <div className="flex flex-1 flex-col gap-2">
                <div className="skeleton-shimmer h-4 w-40 rounded bg-[#2A2A2A]" />
                <div className="skeleton-shimmer h-3 w-32 rounded bg-[#2A2A2A]" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="skeleton-shimmer h-7 w-12 rounded bg-[#2A2A2A]" />
                <div className="skeleton-shimmer h-6 w-20 rounded-md bg-[#2A2A2A]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
