@echo off
REM MBHealth Setup Script for Windows
REM This script helps you set up the MBHealth application quickly

setlocal enabledelayedexpansion

REM Colors for output (Windows 10+)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Function to print colored output
:print_status
echo %BLUE%[INFO]%NC% %~1
goto :eof

:print_success
echo %GREEN%[SUCCESS]%NC% %~1
goto :eof

:print_warning
echo %YELLOW%[WARNING]%NC% %~1
goto :eof

:print_error
echo %RED%[ERROR]%NC% %~1
goto :eof

REM Function to check if command exists
:command_exists
where %1 >nul 2>&1
if %errorlevel% equ 0 (
    exit /b 0
) else (
    exit /b 1
)

REM Function to check Python version
:check_python_version
call :command_exists python
if %errorlevel% equ 0 (
    python -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)" >nul 2>&1
    if %errorlevel% equ 0 (
        for /f "tokens=*" %%i in ('python -c "import sys; print('.'.join(map(str, sys.version_info[:2])))"') do set python_version=%%i
        call :print_success "Python !python_version! found"
        exit /b 0
    ) else (
        call :print_error "Python 3.8+ required"
        exit /b 1
    )
) else (
    call :print_error "Python not found"
    exit /b 1
)

REM Function to install uv
:install_uv
call :command_exists uv
if %errorlevel% equ 0 (
    call :print_success "uv is already installed"
    exit /b 0
)

call :print_status "Installing uv..."
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
if %errorlevel% equ 0 (
    call :print_success "uv installed successfully"
    exit /b 0
) else (
    call :print_error "Failed to install uv"
    call :print_status "Please install uv manually: https://docs.astral.sh/uv/getting-started/installation/"
    exit /b 1
)

REM Function to check Node.js
:check_nodejs
call :command_exists node
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node --version') do set node_version=%%i
    for /f "tokens=*" %%i in ('npm --version') do set npm_version=%%i
    call :print_success "Node.js !node_version! and npm !npm_version! found"
    exit /b 0
) else (
    call :print_error "Node.js not found"
    call :print_status "Please install Node.js 16+ from https://nodejs.org/"
    exit /b 1
)

REM Function to check Docker
:check_docker
call :command_exists docker
if %errorlevel% equ 0 (
    call :command_exists docker-compose
    if %errorlevel% equ 0 (
        call :print_success "Docker and Docker Compose found"
        exit /b 0
    ) else (
        call :print_warning "Docker Compose not found"
        exit /b 1
    )
) else (
    call :print_warning "Docker not found - containerized setup will not be available"
    exit /b 1
)

REM Function to setup backend
:setup_backend
call :print_status "Setting up backend..."

cd backend

REM Install dependencies
call :print_status "Installing Python dependencies..."
uv sync --group dev

REM Create .env file if it doesn't exist
if not exist .env (
    call :print_status "Creating .env file..."
    (
        echo # Security
        echo SECRET_KEY=your-super-secret-key-here-make-it-long-and-random
        echo ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=30
        echo.
        echo # Database
        echo DATABASE_URL=sqlite:///./health_data.db
        echo.
        echo # CORS Settings
        echo ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
        echo.
        echo # AI Service API Keys ^(optional^)
        echo OPENAI_API_KEY=your-openai-api-key
        echo OPENROUTER_API_KEY=your-openrouter-api-key
        echo GOOGLE_AI_API_KEY=your-google-ai-api-key
        echo.
        echo # Redis ^(for caching and sessions^)
        echo REDIS_URL=redis://localhost:6379
    ) > .env
    call :print_success "Created .env file"
) else (
    call :print_status ".env file already exists"
)

REM Initialize database
call :print_status "Initializing database..."
uv run alembic upgrade head

cd ..
call :print_success "Backend setup complete"
exit /b 0

REM Function to setup frontend
:setup_frontend
call :print_status "Setting up frontend..."

cd frontend

REM Install dependencies
call :print_status "Installing Node.js dependencies..."
npm install

cd ..
call :print_success "Frontend setup complete"
exit /b 0

REM Function to show help
:show_help
echo MBHealth Setup Script
echo.
echo Usage: %0 [OPTION]
echo.
echo Options:
echo   setup     Set up the development environment
echo   start     Start the application
echo   check     Check system requirements
echo   help      Show this help message
echo.
echo Examples:
echo   %0 setup    # Set up the development environment
echo   %0 start    # Start the application
echo   %0 check    # Check if all requirements are met
exit /b 0

REM Main script logic
set "action=%~1"
if "%action%"=="" set "action=setup"

if "%action%"=="setup" (
    call :print_status "Setting up MBHealth development environment..."
    
    REM Check requirements
    call :check_python_version
    if %errorlevel% neq 0 exit /b 1
    
    call :install_uv
    if %errorlevel% neq 0 exit /b 1
    
    call :check_nodejs
    if %errorlevel% neq 0 exit /b 1
    
    call :check_docker
    
    REM Setup components
    call :setup_backend
    call :setup_frontend
    
    call :print_success "MBHealth setup complete!"
    call :print_status "You can now run '%0 start' to start the application"
    
) else if "%action%"=="check" (
    call :print_status "Checking system requirements..."
    call :check_python_version
    call :check_nodejs
    call :check_docker
    call :command_exists uv
    if %errorlevel% equ 0 (
        call :print_success "uv is installed"
    ) else (
        call :print_warning "uv is not installed"
    )
    
) else if "%action%"=="help" (
    call :show_help
    
) else if "%action%"=="start" (
    call :print_status "Starting MBHealth..."
    call :print_status "Please start the backend and frontend manually:"
    echo.
    echo Terminal 1 ^(Backend^):
    echo   cd backend
    echo   uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
    echo.
    echo Terminal 2 ^(Frontend^):
    echo   cd frontend
    echo   npm run dev
    echo.
    call :print_status "Backend: http://localhost:8000"
    call :print_status "Frontend: http://localhost:5173"
    call :print_status "API Docs: http://localhost:8000/docs"
    
) else (
    call :print_error "Unknown option: %action%"
    call :show_help
    exit /b 1
)

exit /b 0 