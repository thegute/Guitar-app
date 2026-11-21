// The "Mic effect" picker beside Sample mode and Chop a riff (one setting shared by both); the Looper has its own
// (`storeKey`), so a beat maker effect never lands on your loops without you seeing it.
import { usePersist } from '../components/Controls'
import { MIC_FX, MIC_FX_KEY, type MicFx } from './micFx'

export function useMicFx() { return usePersist<MicFx>(MIC_FX_KEY, 'none') }

export function MicFxPicker({ compact = false, storeKey = MIC_FX_KEY, label }: { compact?: boolean; storeKey?: string; label?: string }) {
  const [fx, setFx] = usePersist<MicFx>(storeKey, 'none')
  return (
    <label className="row small mic-fx" style={{ gap: 6, alignItems: 'center' }} title="Put an effect on what you record (it goes onto the recording)">
      <span>{label ?? (compact ? 'Effect' : 'Mic effect')}</span>
      <select className="input sm" value={fx} onChange={e => setFx(e.target.value as MicFx)} aria-label="Mic effect" data-testid="mic-fx">
        {MIC_FX.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
    </label>
  )
}
