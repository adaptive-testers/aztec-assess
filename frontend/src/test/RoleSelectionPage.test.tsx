import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useNavigate } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import RoleSelectionPage from '../features/SignUp/RoleSelectionPage'

import { render } from './utils'

// Mock the router hook
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal() as Record<string, unknown>
    return {
        ...actual,
        useNavigate: vi.fn()
    }
})

// Mock the AuthContext
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        accessToken: null,
        setAccessToken: vi.fn(),
        logout: vi.fn(),
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe("RoleSelectionPage", () => {
    const mockNavigate = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useNavigate).mockReturnValue(mockNavigate)
    })

    describe("Initial Rendering", () => {
        it("renders the title correctly", () => {
            render(<RoleSelectionPage />)
            expect(screen.getByText("Select Your Role")).toBeInTheDocument()
        })

        it("renders both role cards", () => {
            render(<RoleSelectionPage />)
            expect(screen.getByText("Student")).toBeInTheDocument()
            expect(screen.getByText("Instructor")).toBeInTheDocument()
        })

        it("renders the continue button", () => {
            render(<RoleSelectionPage />)
            const continueButton = screen.getByRole('button', { name: 'Continue' })
            expect(continueButton).toBeInTheDocument()
        })

        it("has continue button disabled initially", () => {
            render(<RoleSelectionPage />)
            const continueButton = screen.getByRole('button', { name: 'Continue' })
            expect(continueButton).toBeDisabled()
        })

        it("renders role options with role=button attribute", () => {
            render(<RoleSelectionPage />)
            const roleButtons = screen.getAllByRole('button')
            // Should have 3 buttons: student div, instructor div, and continue button
            expect(roleButtons.length).toBe(3)
        })
    })

    describe("Student Role Selection", () => {
        it("selects student role when clicked", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const studentCard = screen.getByText("Student").closest('div[role="button"]')
            await user.click(studentCard!)
            
            expect(studentCard).toHaveClass('border-[rgba(174,58,58,0.8)]')
        })

        it("enables continue button after selecting student", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const studentCard = screen.getByText("Student").closest('div[role="button"]')
            await user.click(studentCard!)
            
            const continueButton = screen.getByRole('button', { name: 'Continue' })
            expect(continueButton).not.toBeDisabled()
        })

        it("applies correct text color to student label when selected", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const studentCard = screen.getByText("Student").closest('div[role="button"]')
            await user.click(studentCard!)
            
            const studentText = screen.getByText("Student")
            expect(studentText).toHaveClass('text-[var(--color-primary-text)]')
        })

        it("logs the selected role when student is selected and continue is clicked", async () => {
            const user = userEvent.setup()
            const consoleSpy = vi.spyOn(console, 'log')
            render(<RoleSelectionPage />)
            
            const studentCard = screen.getByText("Student").closest('div[role="button"]')
            await user.click(studentCard!)
            
            const continueButton = screen.getByRole('button', { name: 'Continue' })
            await user.click(continueButton)
            
            expect(consoleSpy).toHaveBeenCalledWith('Selected role:', 'student')
            consoleSpy.mockRestore()
        })
    })

    describe("Instructor Role Selection", () => {
        it("selects instructor role when clicked", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const instructorCard = screen.getByText("Instructor").closest('div[role="button"]')
            await user.click(instructorCard!)
            
            expect(instructorCard).toHaveClass('border-[rgba(174,58,58,0.8)]')
        })

        it("enables continue button after selecting instructor", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const instructorCard = screen.getByText("Instructor").closest('div[role="button"]')
            await user.click(instructorCard!)
            
            const continueButton = screen.getByRole('button', { name: 'Continue' })
            expect(continueButton).not.toBeDisabled()
        })

        it("applies correct text color to instructor label when selected", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const instructorCard = screen.getByText("Instructor").closest('div[role="button"]')
            await user.click(instructorCard!)
            
            const instructorText = screen.getByText("Instructor")
            expect(instructorText).toHaveClass('text-[var(--color-primary-text)]')
        })
    })

    describe("Role Switching", () => {
        it("can switch from student to instructor", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const studentCard = screen.getByText("Student").closest('div[role="button"]')
            const instructorCard = screen.getByText("Instructor").closest('div[role="button"]')
            
            // Select student first
            await user.click(studentCard!)
            expect(studentCard).toHaveClass('border-[rgba(174,58,58,0.8)]')
            
            // Switch to instructor
            await user.click(instructorCard!)
            expect(instructorCard).toHaveClass('border-[rgba(174,58,58,0.8)]')
            expect(studentCard).toHaveClass('border-[var(--color-primary-border)]')
        })

        it("can switch from instructor to student", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const studentCard = screen.getByText("Student").closest('div[role="button"]')
            const instructorCard = screen.getByText("Instructor").closest('div[role="button"]')
            
            // Select instructor first
            await user.click(instructorCard!)
            expect(instructorCard).toHaveClass('border-[rgba(174,58,58,0.8)]')
            
            // Switch to student
            await user.click(studentCard!)
            expect(studentCard).toHaveClass('border-[rgba(174,58,58,0.8)]')
            expect(instructorCard).toHaveClass('border-[var(--color-primary-border)]')
        })
    })

    describe("Navigation", () => {
        it("navigates to signup with student role state", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const studentCard = screen.getByText("Student").closest('div[role="button"]')
            await user.click(studentCard!)
            
            const continueButton = screen.getByRole('button', { name: 'Continue' })
            await user.click(continueButton)
            
            expect(mockNavigate).toHaveBeenCalledWith('/sign-up', {
                state: { role: 'student' }
            })
        })

        it("navigates to signup with instructor role state", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const instructorCard = screen.getByText("Instructor").closest('div[role="button"]')
            await user.click(instructorCard!)
            
            const continueButton = screen.getByRole('button', { name: 'Continue' })
            await user.click(continueButton)
            
            expect(mockNavigate).toHaveBeenCalledWith('/sign-up', {
                state: { role: 'instructor' }
            })
        })

        it("does not navigate when continue is clicked without selection", async () => {
            render(<RoleSelectionPage />)
            
            const continueButton = screen.getByRole('button', { name: 'Continue' })
            // Button is disabled, so this click won't do anything
            expect(continueButton).toBeDisabled()
            
            expect(mockNavigate).not.toHaveBeenCalled()
        })
    })

    describe("Keyboard Interactions", () => {
        it("selects student role with Enter key", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const studentCard = screen.getByText("Student").closest('div[role="button"]') as HTMLElement
            
            // Focus and press Enter
            studentCard.focus()
            await user.keyboard('{Enter}')
            
            expect(studentCard).toHaveClass('border-[rgba(174,58,58,0.8)]')
        })

        it("selects instructor role with Space key", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const instructorCard = screen.getByText("Instructor").closest('div[role="button"]') as HTMLElement
            
            // Focus and press Space
            instructorCard.focus()
            await user.keyboard(' ')
            
            expect(instructorCard).toHaveClass('border-[rgba(174,58,58,0.8)]')
        })

        it("has tabIndex on role selection divs", () => {
            render(<RoleSelectionPage />)
            
            const studentCard = screen.getByText("Student").closest('div[role="button"]')
            const instructorCard = screen.getByText("Instructor").closest('div[role="button"]')
            
            expect(studentCard).toHaveAttribute('tabIndex', '0')
            expect(instructorCard).toHaveAttribute('tabIndex', '0')
        })

        it("can tab through focusable elements", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const studentCard = screen.getByText("Student").closest('div[role="button"]') as HTMLElement
            const instructorCard = screen.getByText("Instructor").closest('div[role="button"]') as HTMLElement
            
            // Start tabbing - only the two role cards should be focusable since Continue is disabled
            await user.tab()
            expect(studentCard).toHaveFocus()
            
            await user.tab()
            expect(instructorCard).toHaveFocus()
            
            // Verify Continue button is not focusable when disabled
            const continueButton = screen.getByRole('button', { name: 'Continue' }) as HTMLElement
            expect(continueButton).toBeDisabled()
            
            // Click student card to enable Continue button
            await user.click(studentCard)
            expect(continueButton).not.toBeDisabled()
            
            // Now manually focus the instructor card and tab forward to Continue
            instructorCard.focus()
            expect(instructorCard).toHaveFocus()
            
            await user.tab()
            expect(continueButton).toHaveFocus()
        })
    })

    describe("Button States", () => {
        it("continue button has correct styling when disabled", () => {
            render(<RoleSelectionPage />)
            const continueButton = screen.getByRole('button', { name: 'Continue' })
            
            expect(continueButton).toHaveClass('cursor-not-allowed')
        })

        it("continue button maintains base styling when enabled", async () => {
            const user = userEvent.setup()
            render(<RoleSelectionPage />)
            
            const studentCard = screen.getByText("Student").closest('div[role="button"]')
            await user.click(studentCard!)
            
            const continueButton = screen.getByRole('button', { name: 'Continue' })
            expect(continueButton).toHaveClass('bg-[var(--color-primary-accent)]')
        })
    })
})