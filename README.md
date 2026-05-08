# Zirect Label Backend

Music distribution platform backend API built with Express, TypeScript, and Node.js.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## 📁 Project Structure

```
src/
├── config/           # Configuration (environment, constants)
├── controllers/      # Request handlers
├── middleware/       # Express middleware (auth, error handling)
├── models/          # Database models & data access
├── routes/          # API route definitions
├── types/           # TypeScript interfaces
├── utils/           # Helper functions (JWT, response)
├── app.ts           # Express app setup
└── index.ts         # Server entry point
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Current user
- `POST /api/auth/logout` - Logout

### Artists
- `GET /api/artists` - List all artists
- `GET /api/artists/stats` - Artist statistics
- `GET /api/artists/:id` - Get artist by ID
- `GET /api/artists/profile/me` - My profile (artist)
- `PUT /api/artists/profile/me` - Update profile (artist)

### Albums
- `GET /api/albums` - List albums
- `GET /api/albums/stats` - Album statistics
- `GET /api/albums/:id` - Get album
- `GET /api/albums/my/list` - My albums (artist)
- `POST /api/albums` - Create album (artist)
- `PUT /api/albums/:id/status` - Update status (admin)

### Analytics
- `GET /api/analytics` - Artist analytics
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics/top-tracks` - Top tracks

### Admin
- `GET /api/admin/dashboard` - Admin overview
- `GET /api/admin/reports` - Generate reports
- `GET /api/admin/processing-queue` - Album queue
- `POST /api/admin/albums/:id/approve` - Approve album
- `POST /api/admin/albums/:id/reject` - Reject album

## 🔐 Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Test Credentials

**Admin:**
- Email: `admin@zirect.com`
- Password: (any value)
- Type: `admin`

**Artist 1:**
- Email: `artist1@example.com`
- Password: (any value)
- Type: `artist`

**Artist 2:**
- Email: `artist2@example.com`
- Password: (any value)
- Type: `artist`

## 📝 Response Format

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Success message",
  "statusCode": 200
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "message": "Error",
  "statusCode": 400
}
```

## 🛠️ Development

### Available Scripts
```bash
pnpm dev        # Start development server with auto-reload
pnpm build      # Compile TypeScript
pnpm start      # Start production server
pnpm lint       # Lint code
pnpm lint:fix   # Fix linting issues
pnpm format     # Format code with Prettier
```

### Code Style
- TypeScript strict mode
- ESLint for code quality
- Prettier for formatting

## 🗄️ Database

Currently using in-memory data storage for MVP.

To migrate to database (Prisma + PostgreSQL):
1. Install Prisma: `pnpm add prisma @prisma/client`
2. Set `DATABASE_URL` in `.env`
3. Create Prisma schema
4. Update controllers to use Prisma ORM

## 🔧 Configuration

Configuration comes from `.env` file:
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - Token expiration time
- `DATABASE_URL` - Database connection string

## 🐳 Docker

Build and run with Docker:
```bash
docker build -t zirect-backend .
docker run -p 5000:5000 --env-file .env zirect-backend
```

## 📚 API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API reference.

## 🚀 Deployment

### Vercel
```bash
vercel deploy
```

### Heroku
```bash
heroku create zirect-label-backend
git push heroku main
```

### Docker to any cloud provider
```bash
docker build -t zirect-backend .
docker tag zirect-backend your-registry/zirect-backend:latest
docker push your-registry/zirect-backend:latest
```

## 🤝 Next Steps

1. **Database Integration** - Replace in-memory with Prisma + PostgreSQL
2. **Real Authentication** - Use bcrypt for password hashing
3. **File Upload** - Add file upload for cover art
4. **Email Notifications** - Setup email service
5. **Testing** - Add unit and integration tests
6. **Monitoring** - Add error tracking and logging
7. **Rate Limiting** - Implement API rate limiting
8. **Caching** - Add Redis for caching

## 📄 License

MIT

## 👥 Support

For issues or questions, please create an issue in the repository.
