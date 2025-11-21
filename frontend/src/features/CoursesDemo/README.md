# Courses Demo Page

⚠️ **This is a demo/reference implementation and should NOT be merged to main.**

This demo page (`/courses-demo`) provides a playground interface for testing the Courses backend API. It's intended as a reference for how to implement the frontend courses feature in the actual application.

## Features

- **Course Management**
  - Create new courses
  - View all courses (with toggle to show archived)
  - Delete courses (with confirmation)
  - Activate/archive courses

- **Join Code Management**
  - Rotate join codes
  - Enable/disable join codes
  - Join courses via join code

- **Member Management**
  - View course members
  - Add members (by email or user ID)
  - Remove members
  - Update member roles

## Usage

1. Navigate to `/courses-demo` in the application
2. You must be logged in with a staff or instructor account
3. Use the interface to test various course operations

## Implementation Notes

This demo shows:
- How to structure API calls using the `COURSES` endpoints
- How to handle paginated responses
- How to manage course state and lifecycle
- How to implement member management UI
- Error handling patterns

## For Teammates

This branch (`feat/courses-frontend-demo`) is published for reference only. Feel free to:
- Check out the branch to see the implementation
- Use it as a reference when building the actual courses feature
- Copy patterns and code snippets as needed

**Do not open a PR to merge this into main** - it's intentionally kept separate as a demo/reference.

