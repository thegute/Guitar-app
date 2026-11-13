import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { applyTheme } from './theme'
import { startGame } from './learn/game'
import { onLogUpdate } from './learn/progress'
import { onPracticeLogged, scheduleReminders } from './learn/reminders'
import { activeSound, loadSound, refreshPackSounds } from './audio/pluck'
import { startShareIn } from './shareIn'

applyTheme()
startGame()
// load the recorded guitar sound in the background
setTimeout(() => void loadSound(activeSound()), 800)
// the owner's sound packs as sounds of their own (names in every sound picker)
setTimeout(() => void refreshPackSounds().catch(() => {}), 400)
// keep two weeks of reminders lined up, and drop today's once you've practised
void scheduleReminders()
onLogUpdate(() => onPracticeLogged())
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void scheduleReminders() })

// things shared into KGuitar from other apps (after the UI is up)
setTimeout(startShareIn, 300)

// the sound lab (Stage 3 measurements): test builds only, its own lazy chunk
if ((window as { __kgTest?: boolean }).__kgTest) void import('./lab/soundLab').then(m => { (window as unknown as { __kgLab: unknown }).__kgLab = m })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
