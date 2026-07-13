import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'shankeswartraders.app',
  appName: 'Shankeswar Traders',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    hostname: 'app.mart.shahji.dev'
  }
};

export default config;
