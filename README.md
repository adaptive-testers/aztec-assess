<p align="center">
  <img src="frontend/src/assets/brand-mark.svg" alt="Aztec Assess logo" width="120" />
</p>

# Aztec Assess

A modern, full-stack assessment platform built with Django and React. Aztec Assess is designed for educational institutions, with an initial focus on San Diego State University (SDSU).

## 👥 Who It's For

- **Students**: Take quizzes, track progress, and review results in a focused workflow.
- **Instructors and TAs**: Manage courses, members, question banks, topics, and quiz delivery.
- **Course/Admin Owners**: Control course lifecycle, permissions, and enrollment flows.

## 🚧 Project Status

**Currently in Development** - Core platform functionality is implemented and actively improving. Authentication, course lifecycle management, dashboard routing, topic-based question management, and student quiz workflows are live in the codebase. Advanced adaptive behavior, broader analytics/reporting, and deeper AI-assisted tooling are still evolving.

## ✨ Features

### 🔐 Authentication
- **Multi-role Support**: Admin, Instructor, and Student roles
- **Email-based Authentication**: Secure login with email/password
- **Google OAuth**: Sign up and log in with Google accounts
- **Microsoft OAuth**: Sign up and log in with Microsoft accounts
- **JWT Token Management**: Stateless authentication with refresh tokens stored in HTTP-only cookies
- **Auto Token Refresh**: Automatic token refresh for seamless user experience
- **Signup Policy Controls**: Optional allowlist and student-only signup modes via environment flags
- **Endpoint Throttling**: Auth endpoint-specific rate limits (login/register/oauth/refresh)

### 📚 Course Management
- **Course Lifecycle**: Create, activate, archive, and delete courses
- **Status Management**: Draft, Active, and Archived states with role-based access
- **Join Code System**: Generate, enable/disable, rotate, and copy join codes for student enrollment
- **Member Management**: Add/remove members by email, view member roles and details
- **Role-Based UI**: Different interfaces and permissions for Owners, Instructors, TAs, and Students
- **Topic Management**: Course-level topics and question-topic associations

### 🧪 Assessment Workflows
- **Instructor Quiz Authoring**: Chapters, questions, quizzes, and question import flows
- **Bulk Question Import**: Import question sets for instructor workflows
- **Student Quiz Experience**: Quiz landing, in-progress attempts, answer submission, and results views
- **Dashboard and Navigation**: Role-aware routes, landing page, legal pages, and not-found handling

### 🎯 Planned Core Features
- **Adaptive Engine Expansion**: More sophisticated question selection and adaptation logic
- **Analytics and Reporting**: Richer performance insights for instructors and course teams
- **AI Authoring Enhancements**: Additional instructor-controlled content assistance features
- **Institutional Integrations**: Deployment and integration hardening for broader adoption

## 🛠️ Tech Stack

### Backend
- **Django 5.2** - Web framework
- **Django REST Framework** - API development
- **Neon PostgreSQL** - Hosted database service
- **JWT Authentication** - Secure token-based auth
- **Gunicorn** - Production-oriented WSGI server runtime
- **Poetry** - Dependency management

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Motion** - UI animation and transitions
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Vite** - Build tool

### Development Tools
- **Docker** - Containerization for development and production
- **ESLint** - Frontend linting
- **Pytest** - Testing framework
- **MyPy** - Type checking
- **Ruff** - Python linting
- **Vitest** - Frontend test runner

### Deployment (Planned)
- **Frontend**: Serverless/static hosting platform (TBD)
- **Backend**: Managed container hosting platform (TBD)
- **Database**: Neon PostgreSQL (hosted)

## 🚀 Getting Started

### Prerequisites
- **Docker Desktop** installed and running ([Download Docker](https://www.docker.com/products/docker-desktop))
- **Neon PostgreSQL account** ([Sign up for free](https://neon.com))
- **Git** (for cloning the repository)

> [!NOTE] 
> If you prefer not to use Docker, you'll also need Python 3.11+, Node.js 20+, and Poetry. See [Manual Setup](#manual-setup-without-docker) section below.

### Quick Start with Docker (Recommended)

#### Step 1: Clone the Repository
```bash
git clone https://github.com/adaptive-testers/aztec-assess
cd aztec-assess
```

#### Step 2: Set Up Neon PostgreSQL Database

1. **Sign up at [neon.com](https://neon.com)** and create a new project
2. **Get your connection string**:
   - In your Neon dashboard → Project → "Connect"
   - Copy the connection string (format: `postgresql://user:pass@host/dbname?sslmode=require`)

#### Step 3: Create Environment File

Create a `.env` file in the root directory:

```bash
# Database (Neon PostgreSQL - required)
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require

# Django Settings (required)
SECRET_KEY=your-secret-key-here-make-it-long-and-random
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:80
CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENABLE_DJANGO_ADMIN=True
ENABLE_API_DOCS=True
SIGNUP_ALLOWLIST_ENABLED=False
STUDENT_MODE_ONLY=False

# Google OAuth (optional - for Google sign-in)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173

# Microsoft OAuth (optional)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:5173/auth-callback.html
```

**Quick Setup:**
- **SECRET_KEY**: Generate one with: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- **Google OAuth**: Optional - only needed if you want Google sign-in. Leave blank if not using.
- Never commit the `.env` file to version control

**Production Deployment Overrides (recommended):**
```bash
DEBUG=False
ENABLE_DJANGO_ADMIN=False
ENABLE_API_DOCS=False

# Endpoint-specific auth throttles
AUTH_THROTTLE_LOGIN_RATE=60/hour
AUTH_THROTTLE_REGISTER_RATE=30/hour
AUTH_THROTTLE_OAUTH_RATE=60/hour
AUTH_THROTTLE_TOKEN_REFRESH_RATE=600/hour

# HTTPS / proxy hardening
COOKIE_SECURE=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
COOKIE_SAMESITE=Lax
SECURE_PROXY_SSL_HEADER=HTTP_X_FORWARDED_PROTO,https
USE_X_FORWARDED_HOST=True
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
SECURE_REFERRER_POLICY=strict-origin-when-cross-origin
```

#### Step 4: Start the Application

```bash
docker compose up --build frontend-dev backend
```

This builds the containers and starts both services. The first build may take a few minutes.

#### Step 5: Initialize Database (First Time Only)

In a new terminal (while Docker is running):

```bash
# Create database tables
docker compose exec backend /app/.venv/bin/python manage.py migrate

# Create admin account (you'll be prompted for email and password)
docker compose exec backend /app/.venv/bin/python manage.py createsuperuser
```

#### Step 6: Access the Application

Open your browser to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin (if enabled)
- **API Docs**: http://localhost:8000/api/docs (if enabled)

**First Time:**
- Sign up for a new account or use your superuser credentials
- Select your role (Student or Instructor) when prompted

#### Useful Docker Commands

```bash
# Start services
docker compose up frontend-dev backend

# Stop services
docker compose down

# View logs
docker compose logs -f

# Run backend commands
docker compose exec backend /app/.venv/bin/python manage.py <command>

# Rebuild after dependency changes
docker compose up --build frontend-dev backend
```

#### Troubleshooting

**Database Connection:**
- Verify `DATABASE_URL` in `.env` includes `?sslmode=require`
- Check Neon dashboard to ensure database is active (not paused)

**Port Conflicts:**
- Ports 5173 or 8000 in use? Stop conflicting services or modify `docker-compose.yml`

**Build Issues:**
- Ensure Docker Desktop is running
- Try: `docker compose build --no-cache`
- Check logs: `docker compose logs backend`

### Manual Setup (Without Docker)

If you prefer not to use Docker, you can set up the project manually. This requires installing Python, Node.js, and their dependencies directly on your system.

#### Prerequisites
- **Python 3.11+** installed and accessible in your PATH
- **Node.js 20+** and npm installed
- **Poetry** for Python dependency management: `pip install poetry` or follow [Poetry installation guide](https://python-poetry.org/docs/#installation)
- **Neon PostgreSQL** account and database (same as Docker setup)

#### Backend Setup

1. **Clone the repository** (if you haven't already)
   ```bash
   git clone https://github.com/adaptive-testers/aztec-assess
   cd aztec-assess/backend
   ```

2. **Install Python dependencies**
   ```bash
   poetry install
   poetry shell  # Activates the virtual environment
   ```

3. **Create `.env` file in the backend directory** (see `backend/.env.example` for all options)
   ```bash
   DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   SECRET_KEY=your-secret-key-here
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:5173
   MICROSOFT_CLIENT_ID=your-microsoft-client-id
   MICROSOFT_TENANT_ID=common
   MICROSOFT_REDIRECT_URI=http://localhost:5173/auth-callback.html
   ```
   Create `frontend/.env` with `VITE_GOOGLE_CLIENT_ID`, `VITE_MICROSOFT_CLIENT_ID`, `VITE_MICROSOFT_TENANT_ID` (see `frontend/.env.example`).

4. **Run database migrations**
   ```bash
   python manage.py migrate
   ```

5. **Create a superuser account**
   ```bash
   python manage.py createsuperuser
   ```
   You'll be prompted for:
   - Email address
   - Password (enter twice)

6. **Start the development server**
   ```bash
   python manage.py runserver
   ```
   
   The backend API will be available at: http://localhost:8000

#### Frontend Setup

1. **Open a new terminal** and navigate to the frontend directory
   ```bash
   cd aztec-assess/frontend
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   
   The frontend will be available at: http://localhost:5173

> [!NOTE]
> **Docker is recommended** for consistent development environments. Manual setup is useful for debugging or if you prefer working directly with the tools.

#### Common Issues

**Python/Poetry:**
- Install Poetry: `curl -sSL https://install.python-poetry.org | python3 -`
- Activate shell: `poetry shell`

**Node.js:**
- Verify version: `node --version` (needs 20+)
- If install fails: `npm install --legacy-peer-deps`

## 🧪 Testing

### Backend Tests
```bash
cd backend
poetry install --no-interaction --no-root
poetry run ruff check .
poetry run mypy .
poetry run pytest
poetry run pytest --cov=apps --cov-report=html
```

### Frontend Tests
```bash
cd frontend
npm ci
npm run lint
npm run test:run
npm run test:coverage
npm run build
```

## 📸 Screenshots

![Landing page](docs/screenshots/01-landing-page.png)
![Login page](docs/screenshots/02-login-page.png)
![Instructor course page](docs/screenshots/03-instructor-course-page.png)
![Student quiz results](docs/screenshots/04-student-quiz-results.png)

## 📁 Project Structure

```text
aztec-assess/
├── backend/                    # Django backend
│   ├── adaptive_testing/       # Main Django project
│   │   ├── settings/           # Environment-specific settings
│   │   └── ...
│   ├── apps/                   # Django applications
│   │   ├── accounts/           # User management and authentication
│   │   ├── courses/            # Course management, enrollment, and topics
│   │   └── quizzes/            # Chapters, questions, quizzes, attempts, imports
│   ├── Dockerfile              # Backend container configuration
│   ├── .dockerignore           # Files excluded from Docker build
│   ├── manage.py
│   └── pyproject.toml
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── features/           # Feature-based components
│   │   │   ├── Course/         # Course settings, join flow, and students page
│   │   │   ├── CourseCreation/ # Course creation page
│   │   │   ├── Dashboard/      # Dashboard layout and landing view
│   │   │   ├── InstructorCourse/ # Instructor quiz/course management
│   │   │   ├── Landing/        # Public landing page
│   │   │   ├── Legal/          # Privacy, terms, and cookies pages
│   │   │   ├── LogIn/          # Login page
│   │   │   ├── NotFound/       # 404 page
│   │   │   ├── Profile/        # User profile page
│   │   │   ├── SignUp/         # Signup and role selection
│   │   │   └── StudentQuizzes/ # Student quiz attempt flow
│   │   ├── components/         # Reusable components
│   │   │   ├── Sidebar/        # Navigation sidebar
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── PublicRoute.tsx
│   │   ├── context/            # Auth and role context providers
│   │   ├── api/                # API client configuration
│   │   ├── test/               # Test files
│   │   └── types/              # TypeScript type definitions
│   ├── Dockerfile              # Multi-stage frontend container
│   ├── .dockerignore           # Files excluded from Docker build
│   ├── nginx.conf              # Nginx config for production
│   └── package.json
├── docker-compose.yml          # Docker Compose configuration
├── .env                        # Environment variables (create this)
└── README.md
```

## 🔧 Development

### Docker Development

The project uses Docker for consistent development environments. The setup includes:

- **Multi-stage builds**: Optimized Docker images for development and production
- **Hot reload**: Code changes are automatically reflected in development containers
- **Volume mounting**: Source code is mounted for instant updates
- **Isolated dependencies**: Node modules and Python virtual environments are containerized

### Code Quality
- **Python**: Ruff for linting, MyPy for type checking, Pytest for backend tests
- **TypeScript**: ESLint for linting, Vitest for frontend tests
- **Pre-commit hooks**: Automated checks before commits

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📞 Support

If you have any questions or need help, please open an issue in the repository.
