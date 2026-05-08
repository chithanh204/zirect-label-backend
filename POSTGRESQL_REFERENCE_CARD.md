# 🐘 PostgreSQL - Setup Complete ✅

## 📊 System Overview

```
Frontend (Next.js)           Backend (Express)         Database (PostgreSQL)
:3000                        :5000 ✅                  localhost:5432 ✅
    │                            │                          │
    └──────────────────────────────────────────────────────────
         API Calls & Responses
```

---

## 🔑 Access Points

| Service | URL | Status |
|---------|-----|--------|
| **Backend API** | http://localhost:5000 | ✅ Running |
| **Prisma Studio** | http://localhost:5555 | ✅ Running |
| **PostgreSQL** | localhost:5432 | ✅ Running |
| **Database** | zirect_label | ✅ Ready |

---

## 📋 Database Contents

```
Users (3)
├─ admin@zirect.com (admin)
├─ artist1@example.com (artist)
└─ artist2@example.com (artist)

Artists (2)
├─ The Weeknd
└─ Drake

Albums (2)
├─ Starboy (4 tracks)
└─ Certified Lover Boy (3 tracks)

Analytics (60 records)
└─ 30 days × 2 artists
```

---

## 🔐 Connection Details

```
Host:     localhost
Port:     5432
Database: zirect_label
User:     postgres
Password: (your setup password)
```

### Connection String
```
postgresql://postgres:PASSWORD@localhost:5432/zirect_label
```
(Check .env file for current connection string)

---

## 📋 Verification Commands

```bash
# Check PostgreSQL connection
psql -U postgres -c "SELECT version();"

# View database
psql -U postgres -l

# Connect to database
psql -U postgres -d zirect_label

# Count users
psql -U postgres -d zirect_label -c "SELECT COUNT(*) FROM users;"

# List all tables
psql -U postgres -d zirect_label -c "\dt"
```

---

## 🛠️ Useful Commands

```bash
# Backend Management
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Run production server

# Database Management
pnpm db:studio        # Open Prisma Studio (http://localhost:5555)
pnpm db:push          # Push schema to database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed test data
pnpm db:reset         # Reset database (⚠️ deletes all data)
```

---

## 🔑 Test Login Credentials

```
Admin:
  Email:    admin@zirect.com
  Password: admin123

Artist 1:
  Email:    artist1@example.com
  Password: artist123

Artist 2:
  Email:    artist2@example.com
  Password: artist123
```

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| `psql: command not found` | PostgreSQL not in PATH or not installed |
| `password authentication failed` | Wrong password in .env CONNECTION STRING |
| `Connection refused` | PostgreSQL service not running |
| `database does not exist` | Check .env DATABASE_URL has correct db name |

---

## 📞 Next Steps

1. ✅ PostgreSQL setup complete
2. ✅ Backend running (port 5000)
3. ✅ Test data seeded
4. 🔜 **Frontend Integration** - Connect React to API
5. 🔜 **Testing** - Test all endpoints
6. 🔜 **Deployment** - Deploy to production
