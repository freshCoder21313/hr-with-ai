import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  server: {
    androidScheme: "https"
  },
  appId: 'com.hrwithai.app',
  appName: 'HR with AI',
  webDir: 'dist'
};

export default config;
