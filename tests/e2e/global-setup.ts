import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('====================================================');
  console.log('[E2E GlobalSetup] Initializing isolated MongoDB database...');
  console.log('====================================================');

  try {
    const rootDir = process.cwd();
    execSync('python backend/scripts/e2e_setup.py', {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        MONGODB_DB_NAME: 'careerx_e2e_db',
        MONGODB_URI: 'mongodb://localhost:27017',
        UPLOAD_DIR: 'uploads_e2e',
      },
    });
    console.log('[E2E GlobalSetup] Database and uploads initialized successfully.');
  } catch (err) {
    console.error('[E2E GlobalSetup] FATAL: Failed to initialize test database:', err);
    throw err;
  }
}
