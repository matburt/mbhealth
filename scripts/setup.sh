#!/bin/bash

# MBHealth Setup Script
# This script helps you set up the MBHealth application quickly

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Python version
check_python_version() {
    if command_exists python3; then
        python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
        if python3 -c "import sys; exit(0 if sys.version_info >= (3, 11) else 1)"; then
            print_success "Python $python_version found"
            return 0
        else
            print_error "Python 3.11+ required, found $python_version"
            return 1
        fi
    else
        print_error "Python 3 not found"
        return 1
    fi
}

# Function to install uv
install_uv() {
    if command_exists uv; then
        print_success "uv is already installed"
        return 0
    fi
    
    print_status "Installing uv..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        curl -LsSf https://astral.sh/uv/install.sh | sh
        source ~/.bashrc
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        curl -LsSf https://astral.sh/uv/install.sh | sh
        source ~/.zshrc
    else
        print_error "Unsupported operating system for automatic uv installation"
        print_status "Please install uv manually: https://docs.astral.sh/uv/getting-started/installation/"
        return 1
    fi
    
    if command_exists uv; then
        print_success "uv installed successfully"
    else
        print_error "Failed to install uv"
        return 1
    fi
}

# Function to check Node.js
check_nodejs() {
    if command_exists node; then
        node_version=$(node --version)
        npm_version=$(npm --version)
        print_success "Node.js $node_version and npm $npm_version found"
        return 0
    else
        print_error "Node.js not found"
        print_status "Please install Node.js 16+ from https://nodejs.org/"
        return 1
    fi
}

# Function to check Docker
check_docker() {
    if command_exists docker && command_exists docker-compose; then
        print_success "Docker and Docker Compose found"
        return 0
    else
        print_warning "Docker not found - containerized setup will not be available"
        return 1
    fi
}

# Function to check Redis
check_redis() {
    if command_exists redis-server; then
        print_success "Redis found"
        return 0
    else
        print_warning "Redis not found - background task processing will not be available"
        print_status "To install Redis:"
        print_status "  Ubuntu/Debian: sudo apt-get install redis-server"
        print_status "  macOS: brew install redis"
        print_status "  Or use Docker: docker run -d --name redis -p 6379:6379 redis:alpine"
        return 1
    fi
}

# Function to setup backend
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing Python dependencies..."
    uv sync --group dev
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file..."
        cat > .env << EOF
# Security
SECRET_KEY=your-super-secret-key-here-make-it-long-and-random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database
DATABASE_URL=sqlite:///./health_data.db

# CORS Settings
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# AI Service API Keys (optional)
OPENAI_API_KEY=your-openai-api-key
OPENROUTER_API_KEY=your-openrouter-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379

# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
EOF
        print_success "Created .env file"
    else
        print_status ".env file already exists"
    fi
    
    # Initialize database
    print_status "Initializing database..."
    make db-init || uv run alembic upgrade head
    
    cd ..
    print_success "Backend setup complete"
}

# Function to setup frontend
setup_frontend() {
    print_status "Setting up frontend..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm install
    
    cd ..
    print_success "Frontend setup complete"
}

# Function to start Redis if not running
start_redis() {
    if pgrep -x "redis-server" > /dev/null; then
        print_status "Redis is already running"
        return 0
    fi
    
    if command_exists redis-server; then
        print_status "Starting Redis..."
        redis-server --daemonize yes
        sleep 2
        if redis-cli ping > /dev/null 2>&1; then
            print_success "Redis started successfully"
            return 0
        else
            print_error "Failed to start Redis"
            return 1
        fi
    else
        print_warning "Redis not installed - background tasks will not work"
        print_status "Starting without Redis support"
        return 1
    fi
}

# Function to start the application
start_application() {
    print_status "Starting MBHealth application..."
    
    # Start Redis if available
    start_redis || true
    
    # Track PIDs for cleanup
    PIDS=()
    
    # Start backend in background
    print_status "Starting backend server..."
    cd backend
    uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
    PIDS+=($!)
    cd ..
    
    # Start Celery worker if Redis is available
    if redis-cli ping > /dev/null 2>&1; then
        print_status "Starting Celery worker for background tasks..."
        cd backend
        uv run celery -A app.core.celery_app worker --loglevel=info &
        PIDS+=($!)
        cd ..
    fi
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    print_status "Starting frontend server..."
    cd frontend
    npm run dev &
    PIDS+=($!)
    cd ..
    
    print_success "MBHealth is starting up!"
    print_status "Backend: http://localhost:8000"
    print_status "Frontend: http://localhost:5173"
    print_status "API Docs: http://localhost:8000/docs"
    if redis-cli ping > /dev/null 2>&1; then
        print_status "Celery Flower (optional): Run 'cd backend && make monitor' in another terminal"
    fi
    print_status ""
    print_status "Press Ctrl+C to stop the application"
    
    # Wait for user to stop
    trap "kill ${PIDS[@]} 2>/dev/null; exit" INT
    wait
}

# Function to show help
show_help() {
    echo "MBHealth Setup Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  setup     Set up the development environment"
    echo "  start     Start the application (backend, frontend, worker)"
    echo "  check     Check system requirements"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup    # Set up the development environment"
    echo "  $0 start    # Start the application"
    echo "  $0 check    # Check if all requirements are met"
}

# Main script logic
main() {
    case "${1:-setup}" in
        "setup")
            print_status "Setting up MBHealth development environment..."
            
            # Check requirements
            check_python_version || exit 1
            install_uv || exit 1
            check_nodejs || exit 1
            check_redis || true  # Redis is optional but recommended
            check_docker || true  # Docker is optional
            
            # Setup components
            setup_backend
            setup_frontend
            
            print_success "MBHealth setup complete!"
            print_status "You can now run '$0 start' to start the application"
            ;;
            
        "start")
            print_status "Starting MBHealth..."
            start_application
            ;;
            
        "check")
            print_status "Checking system requirements..."
            check_python_version
            check_nodejs
            check_redis
            check_docker
            if command_exists uv; then
                print_success "uv is installed"
            else
                print_warning "uv is not installed"
            fi
            if redis-cli ping > /dev/null 2>&1; then
                print_success "Redis is running"
            else
                print_warning "Redis is not running - background tasks will not work"
            fi
            ;;
            
        "help"|"-h"|"--help")
            show_help
            ;;
            
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@" 