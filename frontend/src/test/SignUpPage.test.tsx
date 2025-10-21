import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { publicApi } from '../api/axios'
import { useAuth } from '../context/AuthContext'
import SignUpPage from '../features/SignUp/SignUpPage'

import { render } from './utils'

// Mock the API and Auth context
vi.mock('../api/axios', () => ({
    publicApi: {
        post: vi.fn()
    }
}))

vi.mock('../context/AuthContext', async (importOriginal) => {
    const actual = await importOriginal() as Record<string, unknown>
    return {
        ...actual,
        useAuth: vi.fn()
    }
})

describe("SignUpPage", () => {
    const mockSetAccessToken = vi.fn()
    
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useAuth).mockReturnValue({
            setAccessToken: mockSetAccessToken,
            accessToken: null
        })
    })

    // Basic rendering tests
    it("renders the SignUpPage with the correct title", () => {
        render(<SignUpPage />)
        expect(screen.getByText("Sign Up")).toBeInTheDocument();
    })

    it("renders the SignUpPage with the correct email input", () => {
        render(<SignUpPage />)
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
    })

    it("renders the SignUpPage with the correct password input", () => {
        render(<SignUpPage />)
        expect(screen.getByLabelText("Password")).toBeInTheDocument();
    })

    it("renders the SignUpPage with the correct first name input", () => {
        render(<SignUpPage />)
        expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    })
    
    it("renders the SignUpPage with the correct last name input", () => {
        render(<SignUpPage />)
        expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
    })

    it("renders the SignUpPage with the correct create account button", () => {
        render(<SignUpPage />)
        expect(screen.getByText("Create Account")).toBeInTheDocument();
    })

    // Form validation tests
    describe("Form Validation", () => {
        it("shows validation errors for empty required fields", async () => {
            const user = userEvent.setup()
            render(<SignUpPage />)
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText("First name is required")).toBeInTheDocument()
                expect(screen.getByText("Last name is required")).toBeInTheDocument()
                expect(screen.getByText("Email is required")).toBeInTheDocument()
                expect(screen.getByText("Password is required")).toBeInTheDocument()
            })
        })

        it("validates email format", async () => {
            const user = userEvent.setup()
            render(<SignUpPage />)
            
            const emailInput = screen.getByLabelText("Email")
            await user.type(emailInput, "invalid-email")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            // HTML5 email validation doesn't show custom error messages for invalid format
            // It will show browser's default validation message or no message at all
            // So we just verify the form doesn't submit successfully
            await waitFor(() => {
                expect(publicApi.post).not.toHaveBeenCalled()
            })
        })

        it("validates password minimum length", async () => {
            const user = userEvent.setup()
            render(<SignUpPage />)
            
            const passwordInput = screen.getByLabelText("Password")
            await user.type(passwordInput, "123")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText("Minimum length is 8")).toBeInTheDocument()
            })
        })

        it("validates password contains number", async () => {
            const user = userEvent.setup()
            render(<SignUpPage />)
            
            const passwordInput = screen.getByLabelText("Password")
            await user.type(passwordInput, "password!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText("Password must contain at least one number")).toBeInTheDocument()
            })
        })

        it("validates password contains special character", async () => {
            const user = userEvent.setup()
            render(<SignUpPage />)
            
            const passwordInput = screen.getByLabelText("Password")
            await user.type(passwordInput, "password123")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText("Password must contain at least one special character")).toBeInTheDocument()
            })
        })

        it("accepts valid password", async () => {
            const user = userEvent.setup()
            render(<SignUpPage />)
            
            const passwordInput = screen.getByLabelText("Password")
            await user.type(passwordInput, "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            // Should not show password validation error
            await waitFor(() => {
                expect(screen.queryByText("Password must contain at least one number")).not.toBeInTheDocument()
                expect(screen.queryByText("Password must contain at least one special character")).not.toBeInTheDocument()
            })
        })
    })

    // User interaction tests
    describe("User Interactions", () => {
        it("toggles password visibility", async () => {
            const user = userEvent.setup()
            render(<SignUpPage />)
            
            const passwordInput = screen.getByLabelText("Password") as HTMLInputElement
            const toggleButton = screen.getByLabelText("Show password")
            
            expect(passwordInput.type).toBe("password")
            
            await user.click(toggleButton)
            expect(passwordInput.type).toBe("text")
            expect(screen.getByLabelText("Hide password")).toBeInTheDocument()
            
            await user.click(screen.getByLabelText("Hide password"))
            expect(passwordInput.type).toBe("password")
            expect(screen.getByLabelText("Show password")).toBeInTheDocument()
        })

        it("submits form with valid data", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {
                    tokens: { access: "mock-access-token" }
                }
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            render(<SignUpPage />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(publicApi.post).toHaveBeenCalledWith("/auth/register/", {
                    email: "john@example.com",
                    first_name: "John",
                    last_name: "Doe",
                    password: "password123!",
                    role: "student"
                })
            })
            
            expect(mockSetAccessToken).toHaveBeenCalledWith("mock-access-token")
        })

        it("shows loading state during submission", async () => {
            const user = userEvent.setup()
            // Mock a slow API response
            vi.mocked(publicApi.post).mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve({ data: {} }), 100))
            )
            
            render(<SignUpPage />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            expect(screen.getByText("Creating account...")).toBeInTheDocument()
            expect(submitButton).toBeDisabled()
        })
    })

    // Error handling tests
    describe("Error Handling", () => {
        it("displays API error message", async () => {
            const user = userEvent.setup()
            vi.mocked(publicApi.post).mockRejectedValue(new Error("Network error"))
            
            render(<SignUpPage />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText("An error occurred while creating your account.")).toBeInTheDocument()
            })
        })

        it("error message has proper accessibility attributes", async () => {
            const user = userEvent.setup()
            vi.mocked(publicApi.post).mockRejectedValue(new Error("Network error"))
            
            render(<SignUpPage />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                const errorMessage = screen.getByText("An error occurred while creating your account.")
                expect(errorMessage).toHaveAttribute("aria-live", "polite")
                expect(errorMessage).toHaveAttribute("aria-atomic", "true")
            })
        })
    })

    // Accessibility tests
    describe("Accessibility", () => {
        it("has proper form labels", () => {
            render(<SignUpPage />)
            
            expect(screen.getByLabelText("First Name")).toBeInTheDocument()
            expect(screen.getByLabelText("Last Name")).toBeInTheDocument()
            expect(screen.getByLabelText("Email")).toBeInTheDocument()
            expect(screen.getByLabelText("Password")).toBeInTheDocument()
        })

        it("has accessible password toggle button", () => {
            render(<SignUpPage />)
            
            const toggleButton = screen.getByLabelText("Show password")
            expect(toggleButton).toBeInTheDocument()
            expect(toggleButton).toHaveAttribute("type", "button")
        })

        it("supports keyboard navigation", async () => {
            const user = userEvent.setup()
            render(<SignUpPage />)
            
            const firstNameInput = screen.getByLabelText("First Name")
            const lastNameInput = screen.getByLabelText("Last Name")
            const emailInput = screen.getByLabelText("Email")
            const passwordInput = screen.getByLabelText("Password")
            
            await user.tab()
            expect(firstNameInput).toHaveFocus()
            
            await user.tab()
            expect(lastNameInput).toHaveFocus()
            
            await user.tab()
            expect(emailInput).toHaveFocus()
            
            await user.tab()
            expect(passwordInput).toHaveFocus()
        })
    })

    // UI component tests
    describe("UI Components", () => {
        it("renders social login buttons", () => {
            render(<SignUpPage />)
            
            const googleButton = screen.getByRole("button", { name: /google/i })
            const microsoftButton = screen.getByRole("button", { name: /microsoft/i })
            
            expect(googleButton).toBeInTheDocument()
            expect(microsoftButton).toBeInTheDocument()
        })

        it("renders OR divider", () => {
            render(<SignUpPage />)
            expect(screen.getByText("OR")).toBeInTheDocument()
        })

        it("renders login link", () => {
            render(<SignUpPage />)
            
            const loginLink = screen.getByRole("link", { name: /log in/i })
            expect(loginLink).toBeInTheDocument()
            expect(loginLink).toHaveAttribute("href", "/login")
        })

        it("renders logo images", () => {
            render(<SignUpPage />)
            
            const googleLogo = screen.getByAltText("Google logo")
            const microsoftLogo = screen.getByAltText("Microsoft logo")
            
            expect(googleLogo).toBeInTheDocument()
            expect(microsoftLogo).toBeInTheDocument()
        })
    })
})