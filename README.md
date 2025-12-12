# Aztec Assess

A modern, full-stack adaptive testing platform built with Django and React. Aztec Assess provides intelligent, personalized testing experiences designed for educational institutions, with initial focus on San Diego State University (SDSU).

## 🚧 Project Status

**Currently in Development** - We are actively working on this project. The basic authentication system is complete with user registration and login. Docker support has been added for consistent development environments. Course management features are implemented and functional. Student/instructor dashboards and quiz creation are in development.

## ✨ Features

### 🔐 Authentication
- **Multi-role Support**: Admin, Instructor, and Student roles
- **Email-based Authentication**: Secure login with email verification
- **Google OAuth**: Sign up and log in with Google accounts
- **JWT Token Management**: Stateless authentication with refresh tokens stored in HTTP-only cookies
- **Auto Token Refresh**: Automatic token refresh for seamless user experience
- **Microsoft OAuth**: Planned for future implementation

### 📚 Course Management
- **Course Lifecycle**: Create, activate, archive, and delete courses
- **Status Management**: Draft, Active, and Archived states with role-based access
- **Join Code System**: Generate, enable/disable, rotate, and copy join codes for student enrollment
- **Member Management**: Add/remove members by email, view member roles and details
- **Role-Based UI**: Different interfaces and permissions for Owners, Instructors, TAs, and Students

### 🎯 Planned Core Features
- **Student Dashboard**: Personalized learning experience with adaptive quizzes
- **Instructor Dashboard**: Course and quiz management tools with AI assistance
- **Adaptive Testing**: Dynamic difficulty adjustment and format adaptation based on learning styles
- **AI-Powered Features**: Question generation and content assistance (instructor-controlled)
- **Real-time Analytics**: Performance tracking and learning insights

## 🛠️ Tech Stack

### Backend
- **Django 5.2** - Web framework
- **Django REST Framework** - API development
- **Neon PostgreSQL** - Hosted database service
- **JWT Authentication** - Secure token-based auth
- **Poetry** - Dependency management

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Vite** - Build tool

### Development Tools
- **Docker** - Containerization for development and production
- **ESLint & Prettier** - Code formatting
- **Pytest** - Testing framework
- **MyPy** - Type checking
- **Ruff** - Python linting

### Deployment (Planned)
- **Frontend**: Serverless platform (TBD)
- **Backend**: Cloud hosting platform (TBD)
- **Database**: Neon PostgreSQL (hosted)

## 🚀 Getting Started

### Prerequisites
- **Docker Desktop** installed and running ([Download Docker](https://www.docker.com/products/docker-desktop))
- **Neon PostgreSQL account** ([Sign up for free](https://neon.com))
- **Git** (for cloning the repository)

> [!NOTE] 
> If you prefer not to use Docker, you'll also need Python 3.11+, Node.js 18+, and Poetry. See [Manual Setup](#manual-setup-without-docker) section below.

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

# Google OAuth (optional - for Google sign-in)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173
```

**Quick Setup:**
- **SECRET_KEY**: Generate one with: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- **Google OAuth**: Optional - only needed if you want Google sign-in. Leave blank if not using.
- Never commit the `.env` file to version control

#### Step 4: Start the Application

```bash
docker-compose up --build frontend-dev backend
```

This builds the containers and starts both services. The first build may take a few minutes.

#### Step 5: Initialize Database (First Time Only)

In a new terminal (while Docker is running):

```bash
# Create database tables
docker-compose exec backend /app/.venv/bin/python manage.py migrate

# Create admin account (you'll be prompted for email and password)
docker-compose exec backend /app/.venv/bin/python manage.py createsuperuser
```

#### Step 6: Access the Application

Open your browser to:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin (optional)

**First Time:**
- Sign up for a new account or use your superuser credentials
- Select your role (Student or Instructor) when prompted

#### Useful Docker Commands

```bash
# Start services
docker-compose up frontend-dev backend

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Run backend commands
docker-compose exec backend /app/.venv/bin/python manage.py <command>

# Rebuild after dependency changes
docker-compose up --build frontend-dev backend
```

#### Troubleshooting

**Database Connection:**
- Verify `DATABASE_URL` in `.env` includes `?sslmode=require`
- Check Neon dashboard to ensure database is active (not paused)

**Port Conflicts:**
- Ports 5173 or 8000 in use? Stop conflicting services or modify `docker-compose.yml`

**Build Issues:**
- Ensure Docker Desktop is running
- Try: `docker-compose build --no-cache`
- Check logs: `docker-compose logs backend`

### Manual Setup (Without Docker)

If you prefer not to use Docker, you can set up the project manually. This requires installing Python, Node.js, and their dependencies directly on your system.

#### Prerequisites
- **Python 3.11+** installed and accessible in your PATH
- **Node.js 18+** and npm installed
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

3. **Create `.env` file in the backend directory**
   ```bash
   DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
   SECRET_KEY=your-secret-key-here
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:5173
   ```

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
- Verify version: `node --version` (needs 18+)
- If install fails: `npm install --legacy-peer-deps`

## 🧪 Testing

### Backend Tests
```bash
cd backend
poetry run pytest
poetry run pytest --cov=apps --cov-report=html
```

### Frontend Tests
```bash
cd frontend
npm run test
npm run test:coverage
```

## 📁 Project Structure

```text
aztec-assess/
├── backend/                    # Django backend
│   ├── adaptive_testing/       # Main Django project
│   │   ├── settings/           # Environment-specific settings
│   │   └── ...
│   ├── apps/                   # Django applications
│   │   ├── accounts/           # User management and authentication
│   │   └── courses/            # Course management and enrollment
│   ├── Dockerfile              # Backend container configuration
│   ├── .dockerignore           # Files excluded from Docker build
│   ├── manage.py
│   └── pyproject.toml
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── features/           # Feature-based components
│   │   │   ├── Course/         # Course management (detail page, join page)
│   │   │   ├── CourseCreation/ # Course creation page
│   │   │   ├── Dashboard/      # Dashboard layout
│   │   │   ├── LogIn/          # Login page
│   │   │   ├── Profile/        # User profile page
│   │   │   └── SignUp/         # Sign up page
│   │   ├── components/         # Reusable components
│   │   │   ├── Sidebar/        # Navigation sidebar
│   │   │   ├── Toast.tsx       # Toast notifications
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── PublicRoute.tsx
│   │   ├── context/            # React context providers
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
- **Python**: Ruff for linting, MyPy for type checking
- **TypeScript**: ESLint for linting, strict type checking
- **Pre-commit hooks**: Automated code formatting and linting

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📞 Support

If you have any questions or need help, please open an issue in the repository.

---

**Note**: This project is currently in active development and is initially designed for San Diego State University (SDSU). Features and documentation may change as we continue to build and improve the platform.

## 🎓 About Aztec Assess

Aztec Assess is designed to revolutionize how educational institutions conduct assessments by providing adaptive testing capabilities that adjust to individual student learning styles and performance. The platform emphasizes instructor control while leveraging AI as a supportive tool for content generation and analysis.

This project is being developed as part of a capstone project class, demonstrating real-world software development practices and modern web technologies in an educational context.

### Key Principles
- **Instructor-Centric**: AI serves as an assistant, not a replacement for instructor expertise
- **Adaptive Learning**: Questions and formats adapt to accommodate different learning styles
- **Educational Focus**: Built specifically for educational institutions with SDSU as the initial deployment target
