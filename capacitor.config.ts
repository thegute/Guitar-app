import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.kguitar',
  appName: 'KGuitar',
  webDir: 'dist',
  android: { backgroundColor: '#14002b' },
  plugins: {
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover', style: 'DEFAULT' },
  },
}
export default config
