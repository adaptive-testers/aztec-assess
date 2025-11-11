import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { publicApi } from '../api/axios'
import { AUTH } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import SignUpContainer from '../features/SignUp/SignUpPage'

import { render } from './utils'

// Mock the API, Auth context, and router hooks
vi.mock('../api/axios', () => ({
    publicApi: {
        post: vi.fn(() => Promise.reject(new Error('No refresh token')))
    }
}))

vi.mock('../context/AuthContext', async (importOriginal) => {
    const actual = await importOriginal() as Record<string, unknown>
    return {
        ...actual,
        useAuth: vi.fn(),
        AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
    }
})

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal() as Record<string, unknown>
    return {
        ...actual,
        useNavigate: vi.fn(),
        useLocation: vi.fn(),
        Link: ({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) => 
            <a href={to} className={className}>{children}</a>
    }
})

describe("SignUpContainer", () => {
    const mockSetAccessToken = vi.fn()
    const mockNavigate = vi.fn()
    
    beforeEach(() => {
        vi.clearAllMocks()
        
        vi.mocked(useAuth).mockReturnValue({
            setAccessToken: mockSetAccessToken,
            accessToken: null
        })
        
        vi.mocked(useNavigate).mockReturnValue(mockNavigate)
        
        // Default: provide role state
        vi.mocked(useLocation).mockReturnValue({
            state: { role: 'student' },
            pathname: '/sign-up',
            search: '',
            hash: '',
            key: 'default'
        })
    })

    // Basic rendering tests
    describe("Rendering", () => {
        it("renders the SignUpContainer with the correct title", () => {
            render(<SignUpContainer />)
            expect(screen.getByText("Complete Your Account!")).toBeInTheDocument()
        })

        it("renders all form fields", () => {
            render(<SignUpContainer />)
            expect(screen.getByLabelText("First Name")).toBeInTheDocument()
            expect(screen.getByLabelText("Last Name")).toBeInTheDocument()
            expect(screen.getByLabelText("Email")).toBeInTheDocument()
            expect(screen.getByLabelText("Password")).toBeInTheDocument()
        })

        it("renders the create account button", () => {
            render(<SignUpContainer />)
            expect(screen.getByText("Create Account")).toBeInTheDocument()
        })

        it("renders social login buttons as disabled", () => {
            render(<SignUpContainer />)
            
            const googleButton = screen.getByLabelText("Sign up with Google")
            const microsoftButton = screen.getByLabelText("Sign up with Microsoft")
            
            expect(googleButton).toBeDisabled()
            expect(microsoftButton).toBeDisabled()
        })

        it("renders OR divider", () => {
            render(<SignUpContainer />)
            expect(screen.getByText("OR")).toBeInTheDocument()
        })

        it("renders login link", () => {
            render(<SignUpContainer />)
            const loginLink = screen.getByText("Log in")
            expect(loginLink.closest('a')).toHaveAttribute("href", "/")
        })

        it("renders 'Already have an account?' text", () => {
            render(<SignUpContainer />)
            expect(screen.getByText(/Already have an account\?/)).toBeInTheDocument()
        })
    })

    // Role state handling
    describe("Role State Handling", () => {
        it("redirects to home if no role is provided", () => {
            vi.mocked(useLocation).mockReturnValue({
                state: null,
                pathname: '/sign-up',
                search: '',
                hash: '',
                key: 'default'
            })
            
            render(<SignUpContainer />)
            
            expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true })
        })

        it("redirects to home if role is missing from state", () => {
            vi.mocked(useLocation).mockReturnValue({
                state: {},
                pathname: '/sign-up',
                search: '',
                hash: '',
                key: 'default'
            })
            
            render(<SignUpContainer />)
            
            expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true })
        })

        it("does not redirect if role is provided", () => {
            vi.mocked(useLocation).mockReturnValue({
                state: { role: 'instructor' },
                pathname: '/sign-up',
                search: '',
                hash: '',
                key: 'default'
            })
            
            render(<SignUpContainer />)
            
            expect(mockNavigate).not.toHaveBeenCalled()
        })

        it("redirects during submit if role becomes null", async () => {
            const user = userEvent.setup()
            
            // Start with a role
            vi.mocked(useLocation).mockReturnValue({
                state: { role: 'student' },
                pathname: '/sign-up',
                search: '',
                hash: '',
                key: 'default'
            })
            
            const { rerender } = render(<SignUpContainer />)
            
            // Change location state to null (simulate role being lost)
            vi.mocked(useLocation).mockReturnValue({
                state: null,
                pathname: '/sign-up',
                search: '',
                hash: '',
                key: 'default'
            })
            
            rerender(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true })
            })
        })
    })

    // Form validation tests
    describe("Form Validation", () => {
        it("shows validation errors for empty required fields", async () => {
            const user = userEvent.setup()
            render(<SignUpContainer />)
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText("First name is required")).toBeInTheDocument()
                expect(screen.getByText("Last name is required")).toBeInTheDocument()
                expect(screen.getByText("Email is required")).toBeInTheDocument()
                expect(screen.getByText("Password is required")).toBeInTheDocument()
            })
        })

        it("validates password minimum length", async () => {
            const user = userEvent.setup()
            render(<SignUpContainer />)
            
            const firstNameInput = screen.getByLabelText("First Name")
            const lastNameInput = screen.getByLabelText("Last Name")
            const emailInput = screen.getByLabelText("Email")
            const passwordInput = screen.getByLabelText("Password")
            
            await user.type(firstNameInput, "John")
            await user.type(lastNameInput, "Doe")
            await user.type(emailInput, "john@example.com")
            await user.type(passwordInput, "pass1!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText("Minimum length is 8")).toBeInTheDocument()
            })
        })

        it("validates password contains number", async () => {
            const user = userEvent.setup()
            render(<SignUpContainer />)
            
            const firstNameInput = screen.getByLabelText("First Name")
            const lastNameInput = screen.getByLabelText("Last Name")
            const emailInput = screen.getByLabelText("Email")
            const passwordInput = screen.getByLabelText("Password")
            
            await user.type(firstNameInput, "John")
            await user.type(lastNameInput, "Doe")
            await user.type(emailInput, "john@example.com")
            await user.type(passwordInput, "password!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText("Password must contain at least one number")).toBeInTheDocument()
            })
        })

        it("validates password contains special character", async () => {
            const user = userEvent.setup()
            render(<SignUpContainer />)
            
            const firstNameInput = screen.getByLabelText("First Name")
            const lastNameInput = screen.getByLabelText("Last Name")
            const emailInput = screen.getByLabelText("Email")
            const passwordInput = screen.getByLabelText("Password")
            
            await user.type(firstNameInput, "John")
            await user.type(lastNameInput, "Doe")
            await user.type(emailInput, "john@example.com")
            await user.type(passwordInput, "password123")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText("Password must contain at least one special character")).toBeInTheDocument()
            })
        })

        it("accepts valid password with number and special character", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {
                    tokens: { access: "mock-access-token" }
                }
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(publicApi.post).toHaveBeenCalled()
            })
        })

        it("validates email format", async () => {
            const user = userEvent.setup()
            render(<SignUpContainer />)
            
            const emailInput = screen.getByLabelText("Email")
            
            // Type invalid email
            await user.type(emailInput, "invalid-email")
            
            // HTML5 validation should handle this
            expect(emailInput).toHaveAttribute("type", "email")
        })
    })

    // User interaction tests
    describe("User Interactions", () => {
        it("toggles password visibility", async () => {
            const user = userEvent.setup()
            render(<SignUpContainer />)
            
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

        it("submits form with valid data and student role", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {
                    tokens: { access: "mock-access-token" }
                }
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(publicApi.post).toHaveBeenCalledWith(AUTH.REGISTER, {
                    email: "john@example.com",
                    first_name: "John",
                    last_name: "Doe",
                    password: "password123!",
                    role: "student"
                })
            })
            
            expect(mockSetAccessToken).toHaveBeenCalledWith("mock-access-token")
        })

        it("submits form with instructor role when provided", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {
                    tokens: { access: "mock-access-token" }
                }
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            vi.mocked(useLocation).mockReturnValue({
                state: { role: 'instructor' },
                pathname: '/sign-up',
                search: '',
                hash: '',
                key: 'default'
            })
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "Jane")
            await user.type(screen.getByLabelText("Last Name"), "Smith")
            await user.type(screen.getByLabelText("Email"), "jane@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(publicApi.post).toHaveBeenCalledWith("/auth/register/", {
                    email: "jane@example.com",
                    first_name: "Jane",
                    last_name: "Smith",
                    password: "password123!",
                    role: "instructor"
                })
            })
        })

        it("shows loading state during submission", async () => {
            const user = userEvent.setup()
            vi.mocked(publicApi.post).mockImplementation(() => 
                new Promise(resolve => setTimeout(() => resolve({ 
                    data: { tokens: { access: "token" } } 
                }), 100))
            )
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            expect(screen.getByText("Creating account...")).toBeInTheDocument()
            expect(submitButton).toBeDisabled()
        })

        it("navigates to home after successful registration", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {
                    tokens: { access: "mock-access-token" }
                }
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith("/")
            })
        })

        it("displays error message when API call fails", async () => {
            const user = userEvent.setup()
            vi.mocked(publicApi.post).mockRejectedValue(new Error("Network error"))
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument()
            })
        })

        it("error message has proper accessibility attributes", async () => {
            const user = userEvent.setup()
            vi.mocked(publicApi.post).mockRejectedValue(new Error("Network error"))
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                const errorMessage = screen.getByText("An unexpected error occurred")
                expect(errorMessage).toHaveAttribute("aria-live", "polite")
                const alertContainer = errorMessage.closest('[role="alert"]')
                expect(alertContainer).toBeInTheDocument()
            })
        })

        it("does not call setAccessToken if no token in response", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {}
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(publicApi.post).toHaveBeenCalled()
            })
            
            expect(mockSetAccessToken).not.toHaveBeenCalled()
            expect(mockNavigate).not.toHaveBeenCalled()
        })

        it("does not navigate if tokens object is missing", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {
                    message: "Success"
                }
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(publicApi.post).toHaveBeenCalled()
            })
            
            expect(mockSetAccessToken).not.toHaveBeenCalled()
            expect(mockNavigate).not.toHaveBeenCalled()
        })

        it("button is re-enabled after error", async () => {
            const user = userEvent.setup()
            vi.mocked(publicApi.post).mockRejectedValue(new Error("Network error"))
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument()
            })
            
            expect(submitButton).not.toBeDisabled()
        })

        it("does not navigate if successful but no access token", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {
                    tokens: {}
                }
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(publicApi.post).toHaveBeenCalled()
            })
            
            // Should not navigate to home without access token
            expect(mockNavigate).not.toHaveBeenCalledWith("/")
        })
    })

    // Accessibility tests
    describe("Accessibility", () => {
        it("has proper form labels", () => {
            render(<SignUpContainer />)
            
            expect(screen.getByLabelText("First Name")).toBeInTheDocument()
            expect(screen.getByLabelText("Last Name")).toBeInTheDocument()
            expect(screen.getByLabelText("Email")).toBeInTheDocument()
            expect(screen.getByLabelText("Password")).toBeInTheDocument()
        })

        it("password toggle button has accessible label", () => {
            render(<SignUpContainer />)
            
            const toggleButton = screen.getByLabelText("Show password")
            expect(toggleButton).toHaveAttribute("type", "button")
        })

        it("supports keyboard navigation through form fields", async () => {
            const user = userEvent.setup()
            render(<SignUpContainer />)
            
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

        it("social login buttons have accessible labels", () => {
            render(<SignUpContainer />)
            
            expect(screen.getByLabelText("Sign up with Google")).toBeInTheDocument()
            expect(screen.getByLabelText("Sign up with Microsoft")).toBeInTheDocument()
        })

        it("logo images have alt text", () => {
            render(<SignUpContainer />)
            
            expect(screen.getByAltText("Google logo")).toBeInTheDocument()
            expect(screen.getByAltText("Microsoft logo")).toBeInTheDocument()
        })

        it("password toggle button has focus-visible styles", () => {
            render(<SignUpContainer />)
            
            const toggleButton = screen.getByLabelText("Show password")
            expect(toggleButton).toHaveClass("focus-visible:ring-2")
            expect(toggleButton).toHaveClass("focus-visible:ring-primary-accent")
        })

        it("form can be submitted with Enter key", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {
                    tokens: { access: "mock-access-token" }
                }
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            render(<SignUpContainer />)
            
            const firstNameInput = screen.getByLabelText("First Name")
            
            await user.type(firstNameInput, "John")
            await user.tab()
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.tab()
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.tab()
            await user.type(screen.getByLabelText("Password"), "password123!{Enter}")
            
            await waitFor(() => {
                expect(publicApi.post).toHaveBeenCalled()
            })
        })
    })

    // Icon rendering tests
    describe("Icon Rendering", () => {
        it("renders person icon for first name field", () => {
            render(<SignUpContainer />)
            
            const firstNameInput = screen.getByLabelText("First Name")
            const container = firstNameInput.parentElement
            
            expect(container?.querySelector('svg')).toBeInTheDocument()
        })

        it("renders mail icon for email field", () => {
            render(<SignUpContainer />)
            
            const emailInput = screen.getByLabelText("Email")
            const container = emailInput.parentElement
            
            expect(container?.querySelector('svg')).toBeInTheDocument()
        })

        it("renders lock icon for password field", () => {
            render(<SignUpContainer />)
            
            const passwordInput = screen.getByLabelText("Password")
            const container = passwordInput.parentElement
            
            expect(container?.querySelector('svg')).toBeInTheDocument()
        })
    })

    // Edge cases
    describe("Edge Cases", () => {
        it("handles special characters in name fields", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {
                    tokens: { access: "mock-access-token" }
                }
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "Jean-Paul")
            await user.type(screen.getByLabelText("Last Name"), "O'Brien")
            await user.type(screen.getByLabelText("Email"), "jean@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(publicApi.post).toHaveBeenCalledWith("/auth/register/", {
                    email: "jean@example.com",
                    first_name: "Jean-Paul",
                    last_name: "O'Brien",
                    password: "password123!",
                    role: "student"
                })
            })
        })

        it("handles very long names", async () => {
            const user = userEvent.setup()
            const longName = "A".repeat(100)
            
            render(<SignUpContainer />)
            
            const firstNameInput = screen.getByLabelText("First Name") as HTMLInputElement
            await user.type(firstNameInput, longName)
            
            expect(firstNameInput.value).toBe(longName)
        })

        it("handles password with all special characters", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {
                    tokens: { access: "mock-access-token" }
                }
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "!@#$%^&*()1")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(publicApi.post).toHaveBeenCalled()
            })
        })

        it("only navigates home when both token exists and is set", async () => {
            const user = userEvent.setup()
            const mockResponse = {
                data: {
                    tokens: { 
                        access: "mock-access-token",
                        refresh: "mock-refresh-token"
                    }
                }
            }
            vi.mocked(publicApi.post).mockResolvedValue(mockResponse)
            
            render(<SignUpContainer />)
            
            await user.type(screen.getByLabelText("First Name"), "John")
            await user.type(screen.getByLabelText("Last Name"), "Doe")
            await user.type(screen.getByLabelText("Email"), "john@example.com")
            await user.type(screen.getByLabelText("Password"), "password123!")
            
            const submitButton = screen.getByText("Create Account")
            await user.click(submitButton)
            
            await waitFor(() => {
                expect(mockSetAccessToken).toHaveBeenCalledWith("mock-access-token")
                expect(mockNavigate).toHaveBeenCalledWith("/")
            })
        })
    })
})