import { useState } from "react";
import { FaChalkboardTeacher } from "react-icons/fa";
import { IoChevronBack } from "react-icons/io5";
import { TbSchool } from "react-icons/tb";
import { Link, useNavigate } from "react-router-dom";

export default function RoleSelectionPage() {
  const [selectedRole, setSelectedRole] = useState<"student" | "instructor" | null>(null);
  const navigate = useNavigate();

  const handleRoleSelect = (role: "student" | "instructor") => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) {
      navigate("/sign-up", { state: { role: selectedRole } });
    }
  };

  return (
    <div className="relative bg-[var(--color-secondary-background)] w-full max-w-[650px] border-[2px] border-[var(--color-primary-border)] rounded-[15px] flex flex-col items-center justify-center p-4 sm:p-7">
      <Link
        to="/"
        className="fixed left-5 top-5 z-30 inline-flex items-center gap-1 rounded-md border border-[#2F2F2F] bg-[#111111]/80 px-2.5 py-1.5 font-geist text-xs text-[#D4D4D4] backdrop-blur transition hover:border-white hover:text-white"
      >
        <IoChevronBack className="h-3.5 w-3.5" />
        Back
      </Link>

      <h1 className="text-[var(--color-primary-text)] font-geist text-[30px] font-[480] mb-7 text-center">
        Select Your Role
      </h1>

      <div className="flex gap-7 mb-5 w-full max-w-xl">
        <div
          role="button"
          tabIndex={0}
          className={`flex-1 bg-[var(--color-secondary-background)] border-[3px] rounded-lg p-11 cursor-pointer transition-all duration-350 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-accent)] ${
            selectedRole === "student"
              ? "border-[rgba(174,58,58,0.8)] hover:border-[rgba(174,58,58,1)]"
              : "border-[var(--color-primary-border)] hover:border-[rgb(174,58,58)]"
          }`}
          onClick={() => handleRoleSelect("student")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleRoleSelect("student");
            }
          }}
        >
          <div className="flex flex-col items-center">
            <TbSchool
              className={`text-[4.5rem] mb-5 transition-colors duration-200 ${
                selectedRole === "student"
                  ? "text-[var(--color-primary-accent)]"
                  : "text-[var(--color-secondary-text)] group-hover:text-[var(--color-primary-accent)]"
              }`}
            />
            <span
              className={`font-geist text-xl font-[450] transition-colors duration-200 ${
                selectedRole === "student"
                  ? "text-[var(--color-primary-text)]"
                  : "text-[var(--color-secondary-text)] group-hover:text-[var(--color-primary-text)]"
              }`}
            >
              Student
            </span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          className={`flex-1 bg-[var(--color-secondary-background)] border-[3px] rounded-lg p-11 cursor-pointer transition-all duration-350 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-accent)] ${
            selectedRole === "instructor"
              ? "border-[rgba(174,58,58,0.8)] hover:border-[rgba(174,58,58,1)]"
              : "border-[var(--color-primary-border)] hover:border-[rgb(174,58,58)]"
          }`}
          onClick={() => handleRoleSelect("instructor")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleRoleSelect("instructor");
            }
          }}
        >
          <div className="flex flex-col items-center">
            <FaChalkboardTeacher
              className={`text-[4.5rem] mb-5 transition-colors duration-200 ${
                selectedRole === "instructor"
                  ? "text-[var(--color-primary-accent)]"
                  : "text-[var(--color-secondary-text)] group-hover:text-[var(--color-primary-accent)]"
              }`}
            />
            <span
              className={`font-geist text-xl font-[450] transition-colors duration-200 ${
                selectedRole === "instructor"
                  ? "text-[var(--color-primary-text)]"
                  : "text-[var(--color-secondary-text)] group-hover:text-[var(--color-primary-text)]"
              }`}
            >
              Instructor
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={!selectedRole}
        className="text-[var(--color-primary-text)] w-[140px] h-[40px] rounded-[8px] tracking-[0.5px] font-geist font-medium text-[14px] mt-5 cursor-pointer transition-all duration-200 hover:border hover:border-white hover:scale-101 bg-[#EF6262] disabled:cursor-not-allowed disabled:opacity-70"
      >
        Continue
      </button>
    </div>
  );
}
