import app from '@/app';
import config from '@config/config';

const PORT = config.port;
const HOST = (config as any).host || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║   Zirect Label Backend Server                  ║
║   Running on ${HOST}:${PORT}                      ║
║   Environment: ${config.nodeEnv.toUpperCase()} ║
║   Frontend: ${config.frontend.url}             ║
╚════════════════════════════════════════════════╝
  `);

  console.log('\n📡 API Endpoints:');
  console.log('  - Authentication: POST /api/auth/login');
  console.log('  - Artists: GET /api/artists');
  console.log('  - Albums: GET /api/albums');
  console.log('  - Analytics: GET /api/analytics');
  console.log('  - Admin: GET /api/admin/dashboard');
  console.log('\n✅ Server ready to accept connections\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
