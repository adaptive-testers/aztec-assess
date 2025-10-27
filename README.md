# Aztec Assess

A modern, full-stack adaptive testing platform built with Django and React. Aztec Assess provides intelligent, personalized testing experiences designed for educational institutions, with initial focus on San Diego State University (SDSU).

## 🚧 Project Status

**Currently in Development** - We are actively working on this project. The authentication system is nearly complete, and we're preparing to implement the core features including student/instructor dashboards, course management, and quiz creation.

## ✨ Features

### 🔐 Authentication (In Progress)
- **Multi-role Support**: Admin, Instructor, and Student roles
- **Email-based Authentication**: Secure login with email verification
- **JWT Token Management**: Stateless authentication with refresh tokens
- **OAuth Integration**: Google and Microsoft authentication (planned)

### 🎯 Planned Core Features
- **Student Dashboard**: Personalized learning experience with adaptive quizzes
- **Instructor Dashboard**: Course and quiz management tools with AI assistance
- **Course Management**: Create, join, and manage educational courses
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
- **Docker** - Containerization (in progress)
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
- Python 3.11+
- Node.js 18+
- Poetry (for Python dependencies)
- Neon PostgreSQL account (for database)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/adaptive-testers/aztec-assess
   cd aztec-assess
   ```

2. **Install Python dependencies**
   ```bash
   cd backend
   poetry install
   poetry shell
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your Neon database credentials
   ```

4. **Database Setup**
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Run the development server**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000

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

```
adaptive-testing/
├── backend/                # Django backend
│   ├── adaptive_testing/   # Main Django project
│   ├── apps/               # Django applications
│   │   └── accounts/       # User management
│   ├── manage.py
│   └── pyproject.toml
├── frontend/               # React frontend
│   ├── src/
│   │   ├── features/       # Feature-based components
│   │   ├── context/        # React context providers
│   │   ├── api/            # API client configuration
│   │   └── types/          # TypeScript type definitions
│   └── package.json
└── README.md
```

## 🔧 Development

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
