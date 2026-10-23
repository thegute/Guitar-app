import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.kguitar',
  appName: 'KGuitar',
  webDir: 'dist',
  android: { backgroundColor: '#2b1d19' },
  plugins: {
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover', style: 'DARK' },
  },
}
export default config
