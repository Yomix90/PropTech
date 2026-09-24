import { createApp } from './app.js';
import { env } from './config/env.js';
import { isLiveSupabase } from './config/supabase.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 SPOTWORK BACKEND API RUNNING ON PORT ${env.PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`🗄️ Database: ${isLiveSupabase ? 'Supabase Cloud PostgreSQL' : 'Local In-Memory Resilient Store'}`);
  console.log(`🤖 AI Engine: ${env.ANTHROPIC_API_KEY ? 'Claude API (Connected)' : 'Heuristic Recommendation Fallback'}`);
  console.log(`🔗 Health Check: http://localhost:${env.PORT}/api/health`);
  console.log(`🏢 Spaces List: http://localhost:${env.PORT}/api/spaces`);
  console.log(`====================================================`);
});

const handleShutdown = (signal: string) => {
  console.log(`\nReception du signal ${signal}. Arrêt gracieux du serveur HTTP...`);
  server.close(() => {
    console.log('Serveur arrêté avec succès.');
    process.exit(0);
  });
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
