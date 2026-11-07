// The "Mic effect" picker beside Sample mode, Chop a riff and the Looper (one setting shared by all three).
import { usePersist } from '../components/Controls'
import { MIC_FX, MIC_FX_KEY, type MicFx } from './micFx'

export function useMicFx() { return usePersist<MicFx>(MIC_FX_KEY, 'none') }

export function MicFxPicker({ compact = false }: { compact?: boolean }) {
  const [fx, setFx] = useMicFx()
  return (
    <label className="row small mic-fx" style={{ gap: 6, alignItems: 'center' }} title="Put an effect on what you record (it goes onto the recording)">
      <span>{compact ? 'Effect' : 'Mic effect'}</span>
      <select className="input sm" value={fx} onChange={e => setFx(e.target.value as MicFx)} aria-label="Mic effect" data-testid="mic-fx">
        {MIC_FX.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>
    </label>
  )
}
