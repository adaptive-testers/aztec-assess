import { Link } from "react-router-dom";

import BrandLogo from "../../components/Brand/BrandLogo";

interface LegalSection {
  heading: string;
  body: string;
  bullets?: string[];
}

interface LegalPageLayoutProps {
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
}

export default function LegalPageLayout({
  title,
  summary,
  effectiveDate,
  sections,
}: LegalPageLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] px-6 pb-20 pt-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(248,113,113,0.18),transparent_40%),radial-gradient(circle_at_82%_20%,rgba(239,68,68,0.12),transparent_36%)]" />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 rounded-lg border border-[#313131] bg-[#111111] px-3 py-2 text-sm font-geist text-[#E5E5E5] transition hover:border-white">
            <BrandLogo size={26} showWordmark wordmarkClassName="text-base font-medium" />
          </Link>
          <div className="flex items-center gap-4 text-xs font-geist text-[#A9A9A9]">
            <Link to="/legal/privacy" className="transition hover:text-white">Privacy</Link>
            <Link to="/legal/terms" className="transition hover:text-white">Terms</Link>
            <Link to="/legal/cookies" className="transition hover:text-white">Cookies</Link>
          </div>
        </header>

        <article className="rounded-2xl border border-[#2F2F2F] bg-[#101010] p-7 shadow-[0_15px_45px_rgba(0,0,0,0.35)] sm:p-10">
          <p className="font-geist text-xs font-medium tracking-[0.35px] text-[#FCA5A5]">LEGAL</p>
          <h1 className="mt-2 font-geist text-3xl font-semibold tracking-[-0.02em] text-white">{title}</h1>
          <p className="mt-4 font-geist text-sm leading-6 text-[#C3C3C3]">{summary}</p>
          <p className="mt-2 font-geist text-xs text-[#9C9C9C]">Effective date: {effectiveDate}</p>

          <div className="mt-8 space-y-7">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-geist text-lg font-medium text-white sm:text-xl">{section.heading}</h2>
                <p className="mt-2 font-geist text-sm leading-6 text-[#B9B9B9]">{section.body}</p>
                {section.bullets && section.bullets.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="rounded-md border border-[#2D2D2D] bg-[#151515] px-3 py-2 font-geist text-sm text-[#B9B9B9]">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <p className="mt-10 rounded-lg border border-[#2F2F2F] bg-[#151515] px-4 py-3 font-geist text-xs leading-5 text-[#9E9E9E]">
            This document is provided for general informational purposes and does not constitute legal advice.
            Contact <a className="text-[#FCA5A5] hover:text-[#F87171]" href="mailto:legal@aztecassess.app">legal@aztecassess.app</a> with policy questions.
          </p>
        </article>
      </div>
    </div>
  );
}
