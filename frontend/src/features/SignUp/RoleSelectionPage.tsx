import { useState } from 'react'
import { FaChalkboardTeacher } from 'react-icons/fa'
import { TbSchool } from 'react-icons/tb'
import { useNavigate } from 'react-router-dom'

export default function RoleSelectionPage() {
    const [selectedRole, setSelectedRole] = useState<'student' | 'instructor' | null>(null)
    const navigate = useNavigate()

    const handleRoleSelect = (role: 'student' | 'instructor') => {
        setSelectedRole(role)
    }

    const handleContinue = () => {
        if (selectedRole) {
            console.log('Selected role:', selectedRole)
            navigate('/sign-up', { state: { role: selectedRole } })
        }
    }

     return (
        <div className="bg-[var(--color-secondary-background)] w-full max-w-[650px] border-[2px] border-[var(--color-primary-border)] rounded-[15px] flex flex-col items-center justify-center p-4 sm:p-7">
                {/* Title */}
                <h1 className="text-[var(--color-primary-text)] geist-font text-[30px] font-[480] mb-7 text-center">
                    Select Your Role
                </h1>

                {/* Role Options */}
                <div className="flex gap-7 mb-5 w-full max-w-xl">
                    {/* Student Option */}
                    <div 
                        role="button"
                        tabIndex={0}
                        className={`flex-1 bg-[var(--color-secondary-background)] border-[3px] rounded-lg p-11 cursor-pointer transition-all duration-350 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-accent)] ${
                            selectedRole === 'student' 
                                ? 'border-[rgba(174,58,58,0.8)] hover:border-[rgba(174,58,58,1)]' 
                                : 'border-[var(--color-primary-border)] hover:border-[rgb(174,58,58)]'
                        }`}
                        onClick={() => handleRoleSelect('student')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleRoleSelect('student');
                            }
                        }}
                    >
                        <div className="flex flex-col items-center">
                            <TbSchool className={`text-[4.5rem] mb-5 transition-colors duration-200 ${
                                selectedRole === 'student' ? 'text-[var(--color-primary-accent)]' : 'text-[var(--color-secondary-text)] group-hover:text-[var(--color-primary-accent)]'
                            }`} />
                            <span className={`geist-font text-xl font-[450] transition-colors duration-200 ${
                                selectedRole === 'student' ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-secondary-text)] group-hover:text-[var(--color-primary-text)]'
                            }`}>Student</span>
                        </div>
                    </div>

                    {/* Instructor Option */}
                    <div 
                        role="button"
                        tabIndex={0}
                        className={`flex-1 bg-[var(--color-secondary-background)] border-[3px] rounded-lg p-11 cursor-pointer transition-all duration-350 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-accent)] ${
                            selectedRole === 'instructor' 
                                ? 'border-[rgba(174,58,58,0.8)] hover:border-[rgba(174,58,58,1)]' 
                                : 'border-[var(--color-primary-border)] hover:border-[rgb(174,58,58)]'
                        }`}
                        onClick={() => handleRoleSelect('instructor')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleRoleSelect('instructor');
                            }
                        }}
                    >
                        <div className="flex flex-col items-center">
                            <FaChalkboardTeacher className={`text-[4.5rem] mb-5 transition-colors duration-200 ${
                                selectedRole === 'instructor' ? 'text-[var(--color-primary-accent)]' : 'text-[var(--color-secondary-text)] group-hover:text-[var(--color-primary-accent)]'
                            }`} />
                            <span className={`geist-font text-xl font-[450] transition-colors duration-200 ${
                                selectedRole === 'instructor' ? 'text-[var(--color-primary-text)]' : 'text-[var(--color-secondary-text)] group-hover:text-[var(--color-primary-text)]'
                            }`}>Instructor</span>
                        </div>
                    </div>
                </div>

                {/* Continue Button */}
                <div className="relative">
                    <button 
                        onClick={handleContinue}
                        disabled={!selectedRole}
                        className={`text-[var(--color-primary-text)] w-[115px] h-[38px] rounded-[7px] tracking-wider geist-font font-[250] text-[14px] mt-5 cursor-pointer transition-all duration-200 origin-center will-change-transform hover:bg-[var(--color-primary-accent-hover)] hover:shadow-[0_2px_12px_0_rgba(192,74,74,0.25)] ${
                            !selectedRole ? 'bg-[var(--color-primary-accent)] cursor-not-allowed' : 'bg-[var(--color-primary-accent)]'
                        }`}
                    >
                        Continue
                    </button>
                </div>
        </div>
    )
}