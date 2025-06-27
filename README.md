# MBHealth - Health Data Tracking Application

A comprehensive health data tracking application with Python FastAPI backend and TypeScript React frontend, featuring advanced data visualization, AI-powered analysis, and collaborative health management.

## 🚀 Features

### Core Functionality
- **User Authentication**: Secure signup, login, and user management with JWT tokens
- **Health Data Tracking**: Blood pressure, blood sugar, weight, heart rate, temperature, and extensible metrics
- **Advanced Data Visualization**: Interactive charts, trend analysis, correlation studies, and health scoring
- **AI-Powered Analysis**: OpenAI, OpenRouter, and Google Generative AI for intelligent health insights
- **Family & Care Team Management**: Share data with family members and healthcare providers
- **Notes System**: Add contextual notes to specific health data points
- **Real-time Updates**: Live data synchronization and notifications

### Data Visualization Features
- **Multiple Chart Types**: Line, bar, area, scatter, and radar charts
- **Interactive Analytics**: Correlation matrices, distribution analysis, trend detection
- **Time-based Filtering**: 7-day, 30-day, 90-day, 1-year, and all-time views
- **Health Scoring**: AI-powered health assessment and recommendations
- **Export Capabilities**: Data export in multiple formats

### Collaboration Features
- **Family Groups**: Create family circles and share health data
- **Care Teams**: Connect with healthcare providers and specialists
- **Invitation System**: Secure invitation and approval workflows
- **Role-based Access**: Different permission levels for family members and care providers

## 🏗️ Project Structure

```
mbhealth/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes and endpoints
│   │   │   ├── auth.py     # Authentication endpoints
│   │   │   ├── health.py   # Health data endpoints
│   │   │   ├── families.py # Family management
│   │   │   ├── care_teams.py # Care team management
│   │   │   ├── notes.py    # Notes system
│   │   │   └── ai.py       # AI analysis endpoints
│   │   ├── core/           # Configuration and security
│   │   │   ├── config.py   # App configuration
│   │   │   ├── security.py # JWT and password handling
│   │   │   └── database.py # Database connection
│   │   ├── models/         # SQLAlchemy database models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   └── services/       # Business logic and external API calls
│   ├── pyproject.toml      # Modern Python packaging configuration
│   ├── uv.lock             # uv lock file for reproducible builds
│   ├── Makefile            # Development tasks and shortcuts
│   ├── Dockerfile          # Container configuration
│   ├── .python-version     # Python version specification
│   ├── .pre-commit-config.yaml # Code quality hooks
│   └── .gitignore          # Git ignore rules
├── frontend/               # TypeScript React frontend
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   │   ├── HealthDataChart.tsx      # Chart components
│   │   │   ├── DataVisualizationDashboard.tsx # Advanced analytics
│   │   │   ├── SimpleHealthChart.tsx    # Custom SVG charts
│   │   │   ├── HealthDataTable.tsx      # Data table
│   │   │   ├── QuickAddForm.tsx         # Quick data entry
│   │   │   └── ...                     # Other components
│   │   ├── pages/          # Page components
│   │   │   ├── DashboardPage.tsx        # Main dashboard
│   │   │   ├── HealthDataPage.tsx       # Health data management
│   │   │   ├── DataVisualizationPage.tsx # Advanced analytics
│   │   │   ├── NotesPage.tsx            # Notes management
│   │   │   ├── FamiliesPage.tsx         # Family management
│   │   │   ├── CareTeamsPage.tsx        # Care team management
│   │   │   └── AIAnalysisPage.tsx       # AI analysis
│   │   ├── services/       # API service layer
│   │   ├── types/          # TypeScript type definitions
│   │   ├── hooks/          # Custom React hooks
│   │   ├── contexts/       # React contexts (Auth, etc.)
│   │   └── utils/          # Utility functions
│   ├── package.json        # Node.js dependencies
│   ├── vite.config.ts      # Vite configuration
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   └── Dockerfile          # Container configuration
├── docker-compose.yml      # Multi-service container orchestration
└── README.md
```

## 🛠️ Installation & Setup

### Prerequisites

- **Python 3.8+** with uv (recommended) or pip
- **Node.js 16+** with npm
- **Git** for version control
- **Docker & Docker Compose** (optional, for containerized setup)
- **SQLite** (included with Python) or **PostgreSQL** for production

### Quick Start with uv (Recommended)

1. **Install uv** (if not already installed):
   ```bash
   # On macOS/Linux:
   curl -LsSf https://astral.sh/uv/install.sh | sh
   
   # On Windows:
   powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
   ```

2. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd mbhealth
   ```

3. **Use the setup script** (recommended):
   ```bash
   # On macOS/Linux:
   ./scripts/setup.sh setup
   
   # On Windows:
   scripts\setup.bat setup
   ```

4. **Or set up manually**:
   ```bash
   # Set up the backend
   cd backend
   uv sync --group dev
   
   # Set up the frontend
   cd ../frontend
   npm install
   ```

5. **Start the application**:
   ```bash
   # Using the setup script:
   ./scripts/setup.sh start    # macOS/Linux
   scripts\setup.bat start     # Windows
   
   # Or manually:
   # Terminal 1 - Backend
   cd backend
   uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

### Alternative: Docker Setup

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Backend Setup (Detailed)

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies with uv**:
   ```bash
   # Install all dependencies (including dev)
   uv sync --group dev
   
   # Or install specific groups:
   uv sync --group test    # Test dependencies
   uv sync --group docs    # Documentation dependencies
   uv sync --group production  # Production dependencies
   ```

3. **Set up environment variables**:
   ```bash
   # Copy example environment file
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize the database**:
   ```bash
   # The database will be created automatically on first run
   # For PostgreSQL, run migrations:
   uv run alembic upgrade head
   ```

5. **Start the development server**:
   ```bash
   uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory** (from project root):
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Security
SECRET_KEY=your-super-secret-key-here-make-it-long-and-random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=sqlite:///./health_data.db
# For PostgreSQL: DATABASE_URL=postgresql://user:password@localhost/mbhealth

# CORS Settings
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# AI Service API Keys (optional)
OPENAI_API_KEY=your-openai-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Email Settings (for notifications)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379
```

### Frontend Configuration

The frontend automatically connects to `http://localhost:8000` for the API. To change this:

1. Edit `frontend/src/services/api.ts`
2. Update the `BASE_URL` constant

## 🚀 Running the Application

### Development Mode

#### Using uv (Recommended)
```bash
# Backend
cd backend
uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run dev
```

#### Using Make (Backend only)
```bash
cd backend
make run-dev          # Development mode
make run-debug        # Debug mode
make run              # Production mode
```

#### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

1. **Build the frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Set up a production server** (e.g., using Gunicorn):
   ```bash
   cd backend
   uv sync --group production
   uv run gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```

3. **Configure a reverse proxy** (nginx recommended) to serve the frontend and proxy API requests.

## 🛠️ Development Tools

### Backend Development

The backend includes several development tools configured in `pyproject.toml`:

#### Code Quality
```bash
cd backend

# Format code
uv run black .
uv run isort .

# Lint code
uv run ruff check .

# Type checking
uv run mypy app/

# Run all checks
make dev
```

#### Testing
```bash
cd backend

# Run tests
uv run pytest

# Run tests with coverage
uv run pytest --cov=app --cov-report=html

# Run specific test
uv run pytest tests/test_auth.py -v
```

#### Database Management
```bash
cd backend

# Run migrations
uv run alembic upgrade head

# Create new migration
uv run alembic revision --autogenerate -m "Add new feature"

# Reset database
make db-reset
```

#### Pre-commit Hooks
```bash
cd backend

# Install pre-commit hooks
uv run pre-commit install

# Run all hooks manually
uv run pre-commit run --all-files
```

### Frontend Development

```bash
cd frontend

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check
```

## 📊 API Documentation

Once the backend is running, visit:
- **Interactive API Docs**: http://localhost:8000/docs (Swagger UI)
- **Alternative API Docs**: http://localhost:8000/redoc (ReDoc)

## 🗄️ Database Management

### SQLite (Default)
- Database file: `backend/health_data.db`
- Automatically created on first run
- No additional setup required

### PostgreSQL (Production)
1. **Install PostgreSQL** and create a database
2. **Update DATABASE_URL** in `.env`
3. **Run migrations**:
   ```bash
   cd backend
   uv run alembic upgrade head
   ```

### Database Migrations
```bash
cd backend

# Create a new migration
uv run alembic revision --autogenerate -m "Description of changes"

# Apply migrations
uv run alembic upgrade head

# Rollback migrations
uv run alembic downgrade -1
```

## 🔧 Troubleshooting

### Common Issues

1. **uv not found**:
   ```bash
   # Install uv
   curl -LsSf https://astral.sh/uv/install.sh | sh
   # Restart your terminal
   ```

2. **Port already in use**:
   ```bash
   # Find process using port 8000
   lsof -i :8000
   # Kill the process
   kill -9 <PID>
   ```

3. **Python dependencies not found**:
   ```bash
   # Ensure you're in the backend directory
   cd backend
   # Reinstall dependencies
   uv sync --group dev
   ```

4. **Node modules issues**:
   ```bash
   # Clear npm cache
   npm cache clean --force
   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

5. **CORS errors**:
   - Ensure `ALLOWED_ORIGINS` in backend `.env` includes your frontend URL
   - Check that frontend is running on the correct port

6. **Database connection issues**:
   - Verify `DATABASE_URL` in `.env`
   - Ensure database server is running (for PostgreSQL)
   - Check file permissions (for SQLite)

### Development Tips

1. **Enable debug mode**:
   ```bash
   # Backend
   cd backend
   uv run python -m uvicorn main:app --reload --log-level debug
   
   # Frontend
   cd frontend
   npm run dev -- --debug
   ```

2. **View logs**:
   ```bash
   # Backend logs
   tail -f backend/logs/app.log
   
   # Frontend logs (in browser console)
   ```

3. **Reset database**:
   ```bash
   cd backend
   make db-reset
   ```

## 🧪 Testing

### Backend Tests
```bash
cd backend

# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=app --cov-report=html

# Run specific test file
uv run pytest tests/test_auth.py

# Run tests in parallel
uv run pytest -n auto
```

### Frontend Tests
```bash
cd frontend

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### End-to-End Tests
```bash
# Install Playwright
npm install -g playwright
playwright install

# Run E2E tests
npm run test:e2e
```

## 📦 Deployment

### Docker Deployment

1. **Build images**:
   ```bash
   docker build -t mbhealth-backend ./backend
   docker build -t mbhealth-frontend ./frontend
   ```

2. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

### Cloud Deployment

The application can be deployed to:
- **Heroku**: Use Procfile and environment variables
- **AWS**: Use Elastic Beanstalk or ECS
- **Google Cloud**: Use App Engine or Cloud Run
- **Azure**: Use App Service or Container Instances

### Production Checklist

- [ ] Set `DEBUG=False` in environment
- [ ] Use strong `SECRET_KEY`
- [ ] Configure production database (PostgreSQL)
- [ ] Set up SSL/TLS certificates
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Set up development environment**:
   ```bash
   cd backend
   uv sync --group dev
   cd ../frontend
   npm install
   ```
4. **Make your changes** and add tests
5. **Run code quality checks**:
   ```bash
   cd backend
   make dev
   ```
6. **Commit your changes**:
   ```bash
   git commit -m 'Add amazing feature'
   ```
7. **Push to the branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Submit a pull request**

### Development Guidelines

- Follow PEP 8 for Python code
- Use TypeScript strict mode for frontend
- Write tests for new features
- Update documentation for API changes
- Use conventional commit messages
- Run pre-commit hooks before committing

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Create an issue on GitHub
- **Documentation**: Check the API docs at `/docs`
- **Community**: Join our discussions

## 🔮 Roadmap

- [ ] Mobile app (React Native)
- [ ] Wearable device integration
- [ ] Advanced AI insights
- [ ] Telemedicine features
- [ ] HIPAA compliance
- [ ] Multi-language support
- [ ] Offline mode
- [ ] Data export/import
- [ ] Advanced reporting
- [ ] Integration with health systems 