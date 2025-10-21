import { render, type RenderOptions } from '@testing-library/react'
import { type ReactElement } from 'react'

import { AuthProvider } from '../context/AuthContext'

// Custom render function that wraps components with AuthProvider
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { 
  wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
  ...options 
})

export * from '@testing-library/react'
export { customRender as render }
