// Technique lessons: a list, and one lesson with its steps, a video lesson to watch and a drill to play.
import type { Instrument } from '../instrument'
import { TECHNIQUES, markTechnique, techniquesDone, type Technique } from './techniques'

export function TechniqueList({ onOpen, onExit }: { onOpen: (id: string) => void; onExit: () => void }) {
  const done = techniquesDone()
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row"><button className="btn sm" onClick={onExit}>← Back</button><h2 style={{ margin: 0 }}>Technique</h2></div>
      <p className="small muted" style={{ margin: 0 }}>The hands-on skills, one at a time: how to do it, a video lesson to watch, and a drill that KGuitar listens to.</p>
      <ol className="plan-list">
        {TECHNIQUES.map(t => (
          <li key={t.id}>
            <button className={done.has(t.id) ? 'done' : ''} onClick={() => onOpen(t.id)}>
              <span className="plan-check" aria-label={done.has(t.id) ? 'practised' : 'not yet'}>{done.has(t.id) ? '✓' : ''}</span>
              <span className="plan-text"><b>{t.title}</b><span className="small muted">{t.why}</span></span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function TechniqueView({ id, inst, onExit, onDrill }: { id: string; inst: Instrument; onExit: () => void; onDrill: (t: Technique) => void }) {
  const t = TECHNIQUES.find(x => x.id === id)
  if (!t) return <div className="stack"><button className="btn sm" onClick={onExit}>← Back</button></div>
  return (
    <article className="stack technique" style={{ gap: 12 }}>
      <div className="row"><button className="btn sm" onClick={onExit}>← Technique</button></div>
      <h2 style={{ margin: 0 }}>{t.title}</h2>
      <p style={{ margin: 0 }}>{t.why}</p>
      <ol className="tech-steps">
        {t.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <a className="btn tech-video" href={t.video.url} target="_blank" rel="noreferrer">▶ Watch a video lesson: {t.video.title} <span className="small muted">({t.video.site}) ↗</span></a>
      <section className="panel stack" style={{ gap: 8 }}>
        <b>Practice</b>
        <span className="small muted">{inst.isUke && 'tab' in t.drill && t.drill.tab === 'palmmute' ? 'On the ukulele this drill uses single notes.' : 'Play it slowly first. In Play, tap Listen: notes light up green as you get them.'}</span>
        <button className="btn primary" onClick={() => { markTechnique(t.id); onDrill(t) }}>{t.drill.label}</button>
      </section>
    </article>
  )
}
