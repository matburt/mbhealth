# PostgreSQL Setup Guide

This guide will help you configure MBHealth to use PostgreSQL instead of SQLite for production deployments.

## Quick Setup Options

### Option 1: Local PostgreSQL Installation

1. **Install PostgreSQL**:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # macOS (with Homebrew)
   brew install postgresql
   brew services start postgresql
   
   # Windows
   # Download from https://www.postgresql.org/download/windows/
   ```

2. **Create database and user**:
   ```bash
   # Connect to PostgreSQL as postgres user
   sudo -u postgres psql
   
   # Or on macOS:
   psql postgres
   ```
   
   ```sql
   -- Create database
   CREATE DATABASE mbhealth;
   
   -- Create user
   CREATE USER mbhealth WITH PASSWORD 'your_secure_password';
   
   -- Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE mbhealth TO mbhealth;
   
   -- Exit
   \q
   ```

3. **Update your .env file**:
   ```env
   DATABASE_URL=postgresql://mbhealth:your_secure_password@localhost:5432/mbhealth
   ```

### Option 2: Docker PostgreSQL

1. **Use the provided docker-compose.yml**:
   ```bash
   # Start PostgreSQL service only
   docker-compose up -d postgres
   
   # Check if it's running
   docker-compose ps
   ```

2. **Update your .env file**:
   ```env
   DATABASE_URL=postgresql://mbhealth:mbhealth_password@localhost:5432/mbhealth
   ```

### Option 3: Cloud PostgreSQL

#### Heroku Postgres
```env
# Heroku automatically provides DATABASE_URL
# Just ensure your app is connected to a Heroku Postgres add-on
```

#### AWS RDS
```env
DATABASE_URL=postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/mbhealth
```

#### Google Cloud SQL
```env
DATABASE_URL=postgresql://username:password@your-instance-ip:5432/mbhealth
```

#### Digital Ocean Managed Database
```env
DATABASE_URL=postgresql://username:password@your-db-cluster.region.db.ondigitalocean.com:25060/mbhealth?sslmode=require
```

## Database Migration

After configuring PostgreSQL, you need to run the database migrations:

```bash
cd backend

# Install dependencies if not already done
uv sync --group dev

# Run migrations
uv run alembic upgrade head

# Or using make
make db-migrate
```

## Verification

1. **Test the connection**:
   ```bash
   cd backend
   uv run python -c "
   from app.core.database import engine
   from sqlalchemy import text
   with engine.connect() as conn:
       result = conn.execute(text('SELECT version()'))
       print('PostgreSQL version:', result.fetchone()[0])
   "
   ```

2. **Start the application**:
   ```bash
   # Terminal 1: Backend
   cd backend
   uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   
   # Terminal 2: Background Worker
   cd backend
   uv run celery -A app.core.celery_app worker --loglevel=info
   
   # Terminal 3: Frontend
   cd frontend
   npm run dev
   ```

## Production Considerations

### Connection Pooling
For production, consider adding connection pooling settings to your DATABASE_URL:

```env
# Example with connection pooling parameters
DATABASE_URL=postgresql://user:pass@host:5432/dbname?pool_size=10&max_overflow=20&pool_timeout=30
```

### SSL Connection
For cloud databases, ensure SSL is enabled:

```env
# For databases requiring SSL
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
```

### Performance Settings
Consider these PostgreSQL settings for production:

```sql
-- Example performance settings (adjust based on your server resources)
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

-- Reload configuration
SELECT pg_reload_conf();
```

## Troubleshooting

### Common Issues

1. **Connection refused**:
   - Ensure PostgreSQL is running
   - Check the host and port in your DATABASE_URL
   - Verify firewall settings

2. **Authentication failed**:
   - Double-check username and password
   - Ensure the user has proper permissions
   - Check pg_hba.conf for authentication method

3. **Database does not exist**:
   - Create the database using the SQL commands above
   - Ensure the database name matches your DATABASE_URL

4. **Permission denied**:
   ```sql
   -- Grant additional permissions if needed
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mbhealth;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mbhealth;
   ```

### Useful Commands

```bash
# Check PostgreSQL status
sudo systemctl status postgresql    # Linux
brew services list | grep postgres # macOS

# Connect to database
psql postgresql://mbhealth:password@localhost:5432/mbhealth

# List databases
\l

# List tables in current database
\dt

# Describe table structure
\d table_name

# Exit psql
\q
```

## Migration from SQLite

If you're migrating from SQLite to PostgreSQL:

1. **Export data from SQLite** (if you have existing data):
   ```bash
   cd backend
   sqlite3 health_data.db .dump > backup.sql
   ```

2. **Set up PostgreSQL** using the steps above

3. **Run migrations**:
   ```bash
   uv run alembic upgrade head
   ```

4. **Import data** (if needed):
   - Note: Direct SQL import may require manual conversion
   - Consider writing a Python script to transfer data using SQLAlchemy

## Database Maintenance

### Backup
```bash
# Create backup
pg_dump postgresql://mbhealth:password@localhost:5432/mbhealth > backup.sql

# Restore backup
psql postgresql://mbhealth:password@localhost:5432/mbhealth < backup.sql
```

### Monitoring
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('mbhealth'));

-- Check table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::regclass)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

This setup will provide you with a robust, production-ready PostgreSQL configuration for your MBHealth application.