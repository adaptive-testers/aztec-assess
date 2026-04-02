import { Link } from "react-router-dom";

import BrandLogo from "../../components/Brand/BrandLogo";

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-6 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(248,113,113,0.2),transparent_42%),radial-gradient(circle_at_75%_30%,rgba(239,68,68,0.18),transparent_40%)]" />

      <div className="relative z-10 mx-auto w-full max-w-2xl rounded-2xl border border-[#2F2F2F] bg-[#101010] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        <div className="mb-6 flex justify-center">
          <BrandLogo showWordmark wordmarkClassName="text-base font-medium" />
        </div>
        <p className="font-geist text-xs tracking-[0.4px] text-[#FCA5A5]">ERROR 404</p>
        <h1 className="mt-2 font-geist text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-md font-geist text-sm leading-6 text-[#B5B5B5]">
          The page you requested does not exist or may have moved. Use one of the links below to continue.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-lg bg-[#EF6262] px-5 py-2.5 font-geist text-sm font-medium text-white transition hover:border hover:border-white"
          >
            Go Home
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-[#343434] px-5 py-2.5 font-geist text-sm text-[#F1F5F9] transition hover:border-white"
          >
            Log In
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 font-geist text-xs text-[#A8A8A8]">
          <Link to="/legal/privacy" className="transition hover:text-white">Privacy</Link>
          <Link to="/legal/terms" className="transition hover:text-white">Terms</Link>
          <Link to="/legal/cookies" className="transition hover:text-white">Cookies</Link>
        </div>
      </div>
    </div>
  );
}
