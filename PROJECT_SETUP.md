# Rento - Project Setup & Connection Status

## ✅ Setup Complete

All databases and Docker services are configured and connected to your Rento rental marketplace project.

---

## 🐳 Docker Services Status

All services are running and healthy:

| Service | Container | Port | Status | Connection |
|---------|-----------|------|--------|-----------|
| PostgreSQL | rento-postgres | 5433 | ✅ Running | `postgresql://postgres:QWERTY%4018@localhost:5433/public_domain_inventory` |
| Redis | rento-redis | 6379 | ✅ Running | `redis://localhost:6379` |
| Kafka | rento-kafka | 9092 | ✅ Running | `localhost:9092` |
| Zookeeper | rento-zookeeper | 2181 | ✅ Running | `localhost:2181` |

---

## 🌐 Application URLs

| Application | URL | Status |
|-------------|-----|--------|
| **Backend API** | http://localhost:4000 | ✅ Running |
| **Frontend Web** | http://localhost:5174 | ✅ Running |

---

## 📋 Issues Found & Fixed

### 1. **Missing Environment Variables** ✅
   - **Issue**: `.env` was missing `RATE_LIMIT_PREFIX` and `PORT` variables
   - **Fix**: Updated `.env` with all required variables

### 2. **Missing Docker Compose Configuration** ✅
   - **Issue**: Only `docker-compose.kafka.yml` existed; PostgreSQL database wasn't containerized
   - **Fix**: Created comprehensive `docker-compose.yml` with PostgreSQL, Redis, Kafka, and Zookeeper

### 3. **Kafka Listener Configuration Error** ✅
   - **Issue**: `KAFKA_ADVERTISED_LISTENERS` used undefined `PLAINTEXT_HOST` protocol
   - **Error**: `No security protocol defined for listener PLAINTEXT_HOST`
   - **Fix**: Simplified to use only `PLAINTEXT` protocol for localhost connectivity

### 4. **Port Conflicts** ✅
   - **Issue**: Port 4000 (API) was already in use by previous instances
   - **Fix**: Killed conflicting processes and restarted services cleanly

---

## 🗄️ Database Setup

### Schema Status
- ✅ Prisma schema synced with PostgreSQL
- ✅ Database seeded with demo data

### Test Credentials
```
Admin:
  Email: admin@rento.local
  Password: Admin@12345

Advertiser:
  Email: shaadi@rento.local
  Password: Advertiser@123

Customer:
  Email: customer@rento.local
  Password: Customer@123
```

---

## 📝 Configuration Files Updated

### 1. `.env` (apps/api/.env)
```env
DATABASE_URL="postgresql://postgres:QWERTY%4018@localhost:5433/public_domain_inventory?schema=public"
ADMIN_EMAIL="admin@rento.local"
ADMIN_PASSWORD="Admin@12345"
KAFKA_BROKERS="localhost:9092"
KAFKA_CLIENT_ID="rento-api"
KAFKA_GROUP_ID="rento-worker"
REDIS_URL="redis://localhost:6379"
RATE_LIMIT_PREFIX="rento:ratelimit"
PORT="4000"
TRUST_PROXY="false"
```

### 2. `docker-compose.yml` (root)
- PostgreSQL 16 Alpine
- Redis 7.2 Alpine
- Zookeeper 7.6.0 (for Kafka)
- Kafka 7.6.0 (Confluent)
- Proper health checks and volume management
- Network: `rento-network`

---

## 🚀 Running the Project

### Start Services
```bash
# Start Docker services (PostgreSQL, Redis, Kafka)
docker compose up -d

# Check status
docker compose ps
```

### Start Development Servers
```bash
# In separate terminal windows or use npm workspaces:

# Terminal 1: Start API
npm run dev:api

# Terminal 2: Start Web
npm run dev:web
```

### Database Operations
```bash
# Generate Prisma client
npm run db:generate

# Push schema to DB
npm run db:push

# Seed database
npm run db:seed
```

---

## 🔗 Connectivity Verification

### All Connection Tests Passed ✅
- [x] PostgreSQL accepts connections at `localhost:5433`
- [x] Redis accepts connections at `localhost:6379`
- [x] Kafka brokers listening at `localhost:9092`
- [x] API successfully connects to all services
- [x] Database schema synchronized

---

## 🛠️ Troubleshooting

### If Services Don't Start
```bash
# Check container status
docker compose ps

# View logs
docker compose logs -f [service-name]

# Restart all services
docker compose restart

# Complete reset
docker compose down -v
docker compose up -d
```

### If Port Conflicts Occur
```bash
# Check what's using a port (PowerShell)
Get-NetTCPConnection -LocalPort [port] | Select-Object OwningProcess

# Kill process
Stop-Process -Id [PID] -Force
```

### If Kafka Connection Fails
- Ensure Docker Desktop is running
- Check `docker compose ps` - Kafka must be healthy
- Wait 20+ seconds after startup for Kafka readiness
- Check logs: `docker logs rento-kafka`

---

## 📚 Project Structure

```
rento/
├── apps/
│   ├── api/          # Express backend
│   │   ├── prisma/   # Database schema & migrations
│   │   ├── src/
│   │   │   ├── kafka/         # Kafka producer/consumer
│   │   │   ├── database/      # Prisma client
│   │   │   ├── services/      # Business logic
│   │   │   └── routes/        # API endpoints
│   │   └── .env              # Environment variables
│   └── web/          # React frontend
│       ├── src/
│       │   ├── components/    # React components
│       │   ├── pages/         # Page components
│       │   └── api.ts         # API client
│       └── vite.config.ts     # Vite configuration
├── docker-compose.yml   # Docker services
└── package.json        # Root monorepo config
```

---

## 📞 Next Steps

1. **Access the application**: Open http://localhost:5174 in your browser
2. **Test login**: Use admin credentials above
3. **Explore dashboard**: Navigate through admin/advertiser/customer views
4. **Check backend**: Visit http://localhost:4000 for API health

---

**Last Updated**: 2026-06-19
**Status**: ✅ All Systems Ready
