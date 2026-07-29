import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tornaacasa.app',
  appName: 'Torna a casa',
  webDir: 'dist',
  android: {
    adjustMarginsForEdgeToEdge: 'auto'
  }
};

export default config;
