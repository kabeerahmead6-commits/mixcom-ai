import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mixcom.app',
  appName: 'Mixcom AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
