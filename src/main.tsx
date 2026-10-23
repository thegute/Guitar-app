import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { applyTheme } from './theme'
import { startGame } from './learn/game'
import { onLogUpdate } from './learn/progress'
import { onPracticeLogged, scheduleReminders } from './learn/reminders'

applyTheme()
startGame()
// keep two weeks of reminders lined up, and drop today's once you've practised
void scheduleReminders()
onLogUpdate(() => onPracticeLogged())
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void scheduleReminders() })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
