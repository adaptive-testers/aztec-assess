import { AnimatePresence, motion, useInView } from "motion/react";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { FiArrowRight, FiBookOpen, FiGrid, FiLayers, FiMenu, FiTrendingUp, FiUser, FiUsers, FiX } from "react-icons/fi";
import { Link, useLocation } from "react-router-dom";

import BrandLogo from "../../components/Brand/BrandLogo";

const navLinks = [
  { label: "Features", id: "features" },
  { label: "How It Works", id: "how-it-works" },
  { label: "For Students", id: "students" },
  { label: "For Instructors", id: "instructors" },
];

const featureCards = [
  {
    icon: FiGrid,
    title: "Organize courses and quizzes",
    body: "Manage course structures with clearer hierarchy and cleaner daily operations for instructors.",
  },
  {
    icon: FiLayers,
    title: "Question bank management",
    body: "Build reusable question sets by chapter and topic so assessment creation stays consistent.",
  },
  {
    icon: FiUser,
    title: "Student quiz experience",
    body: "Students get a focused, distraction-light interface with straightforward submission flow.",
  },
  {
    icon: FiTrendingUp,
    title: "Progress and results",
    body: "Review completion trends and outcomes with practical visibility into performance.",
  },
];

const steps = [
  {
    icon: FiBookOpen,
    title: "Set up your course",
    body: "Create course structure and organize content so everyone gets clear navigation.",
  },
  {
    icon: FiLayers,
    title: "Create and deliver quizzes",
    body: "Build quizzes from reusable question sets and publish with less friction.",
  },
  {
    icon: FiTrendingUp,
    title: "Track progress",
    body: "Review outcomes and refine the course with better assessment signals.",
  },
];

const studentHighlights = [
  {
    title: "Clear quiz navigation",
    body: "Move through quizzes with predictable progress and straightforward next steps.",
  },
  {
    title: "Focused interface",
    body: "Stay on task with reduced visual noise and clean question presentation.",
  },
  {
    title: "Simple submissions",
    body: "Submit confidently with clear actions and fewer edge-case surprises.",
  },
  {
    title: "Progress visibility",
    body: "See active and completed work in one structured place.",
  },
];

const instructorHighlights = [
  {
    title: "Course and quiz operations",
    body: "Run assessments from a unified workspace built for everyday teaching flow.",
  },
  {
    title: "Reusable question banks",
    body: "Organize by chapter and topic, then reuse content across assessments.",
  },
  {
    title: "Performance visibility",
    body: "Review outcomes and completion patterns with practical context.",
  },
  {
    title: "Less repetitive setup",
    body: "Reduce manual steps so instructional focus stays on course quality.",
  },
];

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
}

function Reveal({ children, className, delay = 0, yOffset = 22 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, {
    amount: 0.25,
    margin: "0px 0px -15% 0px",
  });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0, y: yOffset },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.48, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface GeometricBackgroundProps {
  mouseX: number;
  mouseY: number;
  interactive: boolean;
}

function GeometricBackground({ mouseX, mouseY, interactive }: GeometricBackgroundProps) {
  const parallax = (depth: number) => ({
    transform: interactive ? `translate(${mouseX * depth}px, ${mouseY * depth}px)` : "translate(0px, 0px)",
    transition: "transform 0.16s ease-out",
  });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(239,98,98,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(239,98,98,0.16) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />

      <motion.svg
        data-shape-family="hexagon"
        data-testid="landing-shape-hexagon"
        className="absolute right-[8%] top-[14%] h-[180px] w-[180px] md:h-[220px] md:w-[220px]"
        viewBox="0 0 100 100"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        style={parallax(8)}
      >
        <polygon points="50,5 93,27 93,73 50,95 7,73 7,27" fill="none" stroke="#EF6262" strokeWidth="1.8" opacity="0.32" />
      </motion.svg>

      <motion.svg
        data-shape-family="triangle"
        data-testid="landing-shape-triangle"
        className="absolute bottom-[18%] left-[8%] h-[150px] w-[150px] md:h-[190px] md:w-[190px]"
        viewBox="0 0 100 100"
        animate={{ rotate: [0, -360], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={parallax(10)}
      >
        <polygon points="50,8 95,85 5,85" fill="none" stroke="#F87171" strokeWidth="2" opacity="0.28" />
      </motion.svg>

      <motion.div
        data-shape-family="rounded-square"
        data-testid="landing-shape-rounded-square"
        className="absolute bottom-[30%] right-[24%] h-20 w-20 border-2 border-[#EF6262]/30 md:h-24 md:w-24"
        animate={{ rotate: [0, 90, 180, 270, 360], y: [0, -14, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        style={{ borderRadius: "28%", ...parallax(6) }}
      />

      <motion.svg
        data-shape-family="hexagon"
        data-testid="landing-shape-hexagon"
        className="absolute left-[13%] top-[22%] h-[110px] w-[110px] md:h-[140px] md:w-[140px]"
        viewBox="0 0 100 100"
        animate={{ rotate: [360, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={parallax(7)}
      >
        <polygon points="50,5 93,27 93,73 50,95 7,73 7,27" fill="none" stroke="#F87171" strokeWidth="1.6" opacity="0.2" />
      </motion.svg>

      <motion.svg
        data-shape-family="triangle"
        data-testid="landing-shape-triangle"
        className="absolute left-[26%] top-[10%] h-[78px] w-[78px] md:h-[96px] md:w-[96px]"
        viewBox="0 0 100 100"
        animate={{ rotate: [0, 360], scale: [1, 1.05, 1] }}
        transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
        style={parallax(9)}
      >
        <polygon points="50,8 95,85 5,85" fill="none" stroke="#EF6262" strokeWidth="1.7" opacity="0.24" />
      </motion.svg>

      <motion.div
        data-shape-family="rounded-square"
        data-testid="landing-shape-rounded-square"
        className="absolute bottom-[14%] left-[35%] h-[58px] w-[58px] border-2 border-[#F87171]/25 md:h-[72px] md:w-[72px]"
        animate={{ rotate: [0, 180, 360] }}
        transition={{ duration: 19, repeat: Infinity, ease: "linear" }}
        style={{ borderRadius: "30%", ...parallax(5) }}
      />
    </div>
  );
}

export default function LandingPage() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [parallaxEnabled, setParallaxEnabled] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(pointer: fine)").matches;
  });

  const handleHeroMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!parallaxEnabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: (e.clientX - rect.left - rect.width / 2) / rect.width,
      y: (e.clientY - rect.top - rect.height / 2) / rect.height,
    });
  }, [parallaxEnabled]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(pointer: fine)");
    const onChange = (event: MediaQueryListEvent) => {
      setParallaxEnabled(event.matches);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
    setMobileMenuOpen(false);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050505] text-white">
      <motion.header
        initial={{ y: -96 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className={`fixed left-0 right-0 top-0 z-50 border-b transition-all duration-300 ${
          isScrolled ? "border-white/10 bg-[#080808]/84 backdrop-blur-lg" : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
          <Link
            to="/"
            onClick={(e) => {
              if (location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className="-m-1.5 inline-flex shrink-0 items-center rounded-lg p-1.5 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
            aria-label="Aztec Assess home"
          >
            <BrandLogo
              size={28}
              showWordmark
              wordmarkClassName="text-lg font-semibold tracking-tight"
            />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="font-geist text-sm text-[#AFAFAF] transition-colors hover:text-white"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-lg border border-white/15 bg-[#161616] px-4 py-2 font-geist text-sm text-white transition-all hover:border-white/30 hover:bg-[#1F1F1F]"
            >
              Log In
            </Link>
            <Link
              to="/role-select"
              className="rounded-lg bg-[#EF6262] px-4 py-2 font-geist text-sm font-medium text-white transition-all hover:bg-[#F87171]"
            >
              Sign Up
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              to="/role-select"
              className="rounded-md bg-[#EF6262] px-3 py-1.5 font-geist text-xs font-medium text-white transition-colors hover:bg-[#F87171]"
            >
              Sign Up
            </Link>
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="rounded-md p-2 text-white transition-colors hover:bg-white/5"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-[#080808]/98 pt-24 md:hidden"
          >
            <div className="flex h-full flex-col items-center justify-center gap-8 px-6">
              {navLinks.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="font-geist text-2xl text-[#B8B8B8] transition-colors hover:text-white"
                >
                  {item.label}
                </button>
              ))}
              <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
                <Link
                  to="/role-select"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg bg-[#EF6262] px-5 py-3 text-center font-geist text-base font-medium text-white transition-colors hover:bg-[#F87171]"
                >
                  Create Account
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg border border-white/15 bg-[#151515] px-5 py-3 text-center font-geist text-base text-white transition-colors hover:bg-[#1C1C1C]"
                >
                  Log In
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050505] px-6 pt-28"
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
      >
        <GeometricBackground mouseX={mousePos.x} mouseY={mousePos.y} interactive={parallaxEnabled} />

        <div className="relative z-10 mx-auto max-w-5xl pb-24 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="font-geist text-5xl leading-[1.08] tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl"
          >
            Assessments made{" "}
            <span
              className="hero-clear mt-2 block bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(90deg, #EF6262 0%, #FC7171 45%, #FFFFFF 100%)",
                backgroundSize: "110%",
              }}
            >
              clear
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.48, delay: 0.22 }}
            className="mx-auto mt-7 max-w-3xl font-geist text-lg leading-8 text-[#B7B7B7]"
          >
            Manage courses, deliver quizzes, and review progress with cleaner workflows for instructors and students.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/role-select"
                className="inline-flex items-center gap-2 rounded-lg bg-[#EF6262] px-8 py-4 font-geist text-base font-medium text-white shadow-[0_14px_30px_rgba(239,98,98,0.26)] transition-colors hover:bg-[#F87171]"
              >
                Create Account
                <FiArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/login"
                className="inline-flex items-center rounded-lg border border-white/15 bg-[#181818] px-8 py-4 font-geist text-base text-white transition-colors hover:bg-[#212121]"
              >
                Log In
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55, delay: 0.38 }}
            className="mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-8"
          >
            <div>
              <p className="font-geist text-3xl text-white">Fast</p>
              <p className="mt-1 font-geist text-sm text-[#8F8F8F]">Setup</p>
            </div>
            <div className="border-x border-white/10">
              <p className="font-geist text-3xl text-white">Focused</p>
              <p className="mt-1 font-geist text-sm text-[#8F8F8F]">Experience</p>
            </div>
            <div>
              <p className="font-geist text-3xl text-white">Modern</p>
              <p className="mt-1 font-geist text-sm text-[#8F8F8F]">Workflow</p>
            </div>
          </motion.div>
        </div>
      </section>

      <main className="relative z-10 bg-[#050505] pb-20">
        <section id="features" className="scroll-mt-28 px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mx-auto mb-14 max-w-3xl text-center">
              <h2 className="font-geist text-4xl tracking-[-0.02em] text-white sm:text-5xl">Built for real assessment workflows</h2>
              <p className="mx-auto mt-4 max-w-2xl font-geist text-lg text-[#AFAFAF]">
                Core capabilities designed around the way courses and quizzes actually run.
              </p>
            </Reveal>

            <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
              {featureCards.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Reveal key={feature.title} delay={index * 0.06}>
                    <motion.article
                      whileHover={{ y: -4 }}
                      data-testid="landing-feature-card"
                      className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#171717] p-6 transition-colors hover:border-[#EF6262]/35 hover:bg-[#1D1D1D]"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-[#EF6262]/8 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="relative">
                        <motion.div
                          whileHover={{ rotate: 4, scale: 1.08 }}
                          className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#EF6262]/12 text-[#EF6262]"
                        >
                          <Icon className="h-6 w-6" />
                        </motion.div>
                        <h3 className="font-geist text-xl text-white">{feature.title}</h3>
                        <p className="mt-2 font-geist text-sm leading-6 text-[#AFAFAF]">{feature.body}</p>
                      </div>
                    </motion.article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-28 px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <Reveal className="mx-auto mb-16 max-w-3xl text-center">
              <h2 className="font-geist text-4xl tracking-[-0.02em] text-white sm:text-5xl">How it works</h2>
              <p className="mx-auto mt-4 max-w-2xl font-geist text-lg text-[#AFAFAF]">
                A straightforward flow for both instructors and students.
              </p>
            </Reveal>

            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <Reveal
                  key={step.title}
                  delay={index * 0.08}
                  className="relative px-3 text-center"
                >
                  {index < steps.length - 1 && (
                    <div className="absolute left-[calc(50%+2.25rem)] top-[2.1rem] hidden h-px w-[calc(100%-4.5rem)] bg-gradient-to-r from-white/25 to-transparent md:block" />
                  )}
                  <motion.div
                    whileHover={{ scale: 1.06, rotate: 3 }}
                    className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-[#171717] text-[#EF6262]"
                    data-testid="landing-how-step"
                  >
                    <step.icon className="h-7 w-7" />
                  </motion.div>
                  <h3 className="font-geist text-2xl text-white">{step.title}</h3>
                  <p className="mx-auto mt-3 max-w-sm font-geist text-sm leading-6 text-[#AFAFAF]">{step.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="students" className="scroll-mt-28 px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
              <Reveal className="pt-1">
                <motion.div whileHover={{ rotate: 4, scale: 1.06 }} className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-[#EF6262]/12 text-[#EF6262]">
                  <FiUser className="h-8 w-8" />
                </motion.div>
                <h2 className="font-geist text-4xl tracking-[-0.02em] text-white sm:text-5xl">For Students</h2>
                <p className="mt-4 max-w-xl font-geist text-lg leading-8 text-[#AFAFAF]">
                  Take quizzes in a clean environment that keeps navigation obvious, submissions simple, and progress easy to follow.
                </p>
                <div className="mt-8">
                  <Link
                    to="/role-select"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#EF6262] px-6 py-3 font-geist text-sm font-medium text-white transition-colors hover:bg-[#F87171]"
                  >
                    Start as Student
                    <FiArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="rounded-2xl border border-white/10 bg-[#141414] p-2">
                  {studentHighlights.map((item, index) => (
                    <motion.article
                      key={item.title}
                      whileHover={{ x: 2 }}
                      className={`rounded-xl px-5 py-5 transition-colors hover:bg-[#1A1A1A] ${
                        index !== studentHighlights.length - 1 ? "border-b border-white/10" : ""
                      }`}
                    >
                      <h3 className="font-geist text-base text-white">{item.title}</h3>
                      <p className="mt-2 font-geist text-sm leading-6 text-[#AFAFAF]">{item.body}</p>
                    </motion.article>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section id="instructors" className="scroll-mt-28 bg-[#050505] px-6 py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
              <Reveal delay={0.1}>
                <div className="rounded-2xl border border-white/10 bg-[#141414] p-2">
                  {instructorHighlights.map((item, index) => (
                    <motion.article
                      key={item.title}
                      whileHover={{ x: 2 }}
                      className={`rounded-xl px-5 py-5 transition-colors hover:bg-[#1A1A1A] ${
                        index !== instructorHighlights.length - 1 ? "border-b border-white/10" : ""
                      }`}
                    >
                      <h3 className="font-geist text-base text-white">{item.title}</h3>
                      <p className="mt-2 font-geist text-sm leading-6 text-[#AFAFAF]">{item.body}</p>
                    </motion.article>
                  ))}
                </div>
              </Reveal>

              <Reveal className="pt-1">
                <motion.div whileHover={{ rotate: 4, scale: 1.06 }} className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-[#EF6262]/12 text-[#EF6262]">
                  <FiUsers className="h-8 w-8" />
                </motion.div>
                <h2 className="font-geist text-4xl tracking-[-0.02em] text-white sm:text-5xl">For Instructors</h2>
                <p className="mt-4 max-w-xl font-geist text-lg leading-8 text-[#AFAFAF]">
                  Manage course and assessment operations with less setup overhead and stronger day-to-day visibility.
                </p>
                <div className="mt-8">
                  <Link
                    to="/role-select"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#EF6262] px-6 py-3 font-geist text-sm font-medium text-white transition-colors hover:bg-[#F87171]"
                  >
                    Start as Instructor
                    <FiArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#050505] px-6 py-24">
          <motion.div
            animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="pointer-events-none absolute left-10 top-10 h-28 w-28 opacity-35"
          >
            <svg viewBox="0 0 100 100">
              <polygon points="50,6 94,78 6,78" fill="none" stroke="#EF6262" strokeWidth="2" />
            </svg>
          </motion.div>

          <motion.div
            animate={{ rotate: [0, -360] }}
            transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            className="pointer-events-none absolute bottom-8 right-8 h-24 w-24 rounded-[30%] border-2 border-[#F87171]/25"
          />

          <Reveal className="relative z-10 mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[#121212] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
            <h2 className="font-geist text-4xl tracking-[-0.02em] text-white sm:text-5xl">Ready to simplify assessments?</h2>
            <p className="mx-auto mt-4 max-w-2xl font-geist text-lg text-[#AFAFAF]">
              Set up your account and start building cleaner assessment workflows today.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/role-select"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#EF6262] px-8 py-4 font-geist text-base font-medium text-white transition-colors hover:bg-[#F87171]"
                >
                  Create Account
                  <FiArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#181818] px-8 py-4 font-geist text-base text-white transition-colors hover:bg-[#202020]"
                >
                  <FiArrowRight className="h-4 w-4" />
                  Log In
                </Link>
              </motion.div>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="relative overflow-hidden border-t border-white/10 bg-[#050505]">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#EF6262]/6 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6 py-12">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link
                to="/"
                onClick={(e) => {
                  if (location.pathname === "/") {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="-m-1 inline-flex items-center rounded-lg p-1 outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-white/35"
                aria-label="Aztec Assess home"
              >
                <BrandLogo size={30} />
              </Link>
              <p className="mt-4 max-w-md font-geist text-sm leading-6 text-[#A9A9A9]">
                A modern educational assessment platform for cleaner quiz management and clearer learning workflows.
              </p>
            </div>

            <div>
              <p className="font-geist text-sm text-white">Explore</p>
              <div className="mt-3 space-y-2 font-geist text-sm text-[#9E9E9E]">
                <button onClick={() => scrollToSection("features")} className="block transition hover:text-white">Features</button>
                <button onClick={() => scrollToSection("how-it-works")} className="block transition hover:text-white">How It Works</button>
                <button onClick={() => scrollToSection("students")} className="block transition hover:text-white">For Students</button>
                <button onClick={() => scrollToSection("instructors")} className="block transition hover:text-white">For Instructors</button>
              </div>
            </div>

            <div>
              <p className="font-geist text-sm text-white">Account</p>
              <div className="mt-3 space-y-2 font-geist text-sm text-[#9E9E9E]">
                <Link to="/role-select" className="block transition hover:text-white">Create Account</Link>
                <Link to="/login" className="block transition hover:text-white">Log In</Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-8 md:flex-row md:items-center">
            <p className="font-geist text-sm text-[#767676]">© {new Date().getFullYear()} Aztec Assess. All rights reserved.</p>
            <div className="flex items-center gap-5 text-sm font-geist text-[#878787]">
              <Link to="/legal/privacy" className="transition hover:text-white">Privacy</Link>
              <Link to="/legal/terms" className="transition hover:text-white">Terms</Link>
              <Link to="/legal/cookies" className="transition hover:text-white">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes hero-clear-gleam {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }
        .hero-clear {
          animation: hero-clear-gleam 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
