// Learn → Course: Zero to Hero. Where you are (phase, week), what to work on now (three things at most), today's
// routine as a one-tap session, the gate to pass before the next phase, and the JustinGuitar lessons that go with it.
import { useMemo, useState } from 'react'
import { launch } from '../search/launch'
import { startSession } from '../sessions/session'
import { PATHS, PHASES, RULES, START_CHECK, TEMPO_RULE, currentFocus, gateDone, routine, saveZ2H, weekOf, z2h, z2hStats, type Z2H } from './zeroHero'

export function ZeroToHero({ onRecordings }: { onRecordings: () => void }) {
  const [v, setV] = useState<Z2H>(z2h)
  const set = (n: Z2H) => { saveZ2H(n); setV(n) }
  const stats = useMemo(z2hStats, [])
  const [checks, setChecks] = useState<boolean[]>(() => START_CHECK.map(() => false))
  const [all, setAll] = useState(false)
  const p = PHASES[v.phase - 1]
  const gate = gateDone(p, v, stats)
  const passed = gate.length > 0 && gate.every(g => g.done)
  const focus = currentFocus(v)
  const rule = RULES[new Date().getDate() % RULES.length]
  const sunday = new Date().getDay() === 0
  const monthly = v.lastGate === undefined ? Date.now() - v.since > 28 * 864e5 : Date.now() - v.lastGate > 28 * 864e5

  if (!v.placed) {
    const n = checks.filter(Boolean).length
    return (
      <div className="stack z2h" style={{ gap: 10 }}>
        <p style={{ margin: 0 }}>Your guitar plan, built in. First, tick what you can already do, and it starts you at the right week.</p>
        <ul className="z2h-check">
          {START_CHECK.map((c, i) => (
            <li key={i}><label><input type="checkbox" checked={checks[i]} onChange={e => setChecks(checks.map((x, k) => (k === i ? e.target.checked : x)))} /> {c}</label></li>
          ))}
        </ul>
        <button className="btn primary" onClick={() => set({ phase: 1, since: Date.now() - (n >= 6 ? 28 * 864e5 : 0), placed: true, ticks: [] })}>
          {n >= 6 ? 'Start at Phase 1, week 5' : 'Start at Phase 1, week 1'}
        </button>
        <p className="small muted" style={{ margin: 0 }}>Not sure? JustinGuitar's <a href="https://www.justinguitar.com/guitar-lessons/how-to-pass-grade-1-b1-710" target="_blank" rel="noreferrer">How to Pass Grade 1</a> is a good 10-minute self-test.</p>
      </div>
    )
  }

  return (
    <div className="stack z2h" style={{ gap: 12 }}>
      <div className="z2h-phases" aria-label="Phases">
        {PHASES.map(x => <span key={x.n} className={x.n < v.phase ? 'done' : x.n === v.phase ? 'on' : ''}>{x.n}</span>)}
      </div>
      <div>
        <h3 style={{ margin: 0 }}>Phase {p.n} · {p.title}</h3>
        <span className="small muted">{p.when}{p.weeks ? ` · you're in week ${Math.min(8, weekOf(v))}` : ''}</span>
        <p className="small" style={{ margin: '4px 0 0' }}>{p.why}</p>
      </div>

      <div className="z2h-today">
        <b>{sunday ? 'Sunday: rest, or play just for fun' : "Today's routine"}</b>
        <div className="row" style={{ gap: 6 }}>
          {([20, 45, 60] as const).map(m => <button key={m} className={`btn${m === 45 ? ' primary' : ''}`} onClick={() => { const s = routine(v, m); if (s) startSession(s) }}>▶ {m} min</button>)}
        </div>
        <span className="small muted">Warm-up, chords and rhythm, your current skill, fretboard and ear, then songs. A timer moves you through each part.</span>
      </div>

      <div>
        <b>Work on now</b> <span className="small muted">(three at most)</span>
        <ul className="goal-list">
          {focus.map(f => (
            <li key={f.label}>
              <button onClick={() => f.target && launch(f.target)} disabled={!f.target}>
                <span className="plan-check">›</span><span>{f.label}</span>
              </button>
              {!p.weeks && <button className="btn sm ghost" onClick={() => set({ ...v, ticks: [...v.ticks, 'f:' + f.label] })} title="I've got this one">✓</button>}
            </li>
          ))}
        </ul>
        <p className="small muted" style={{ margin: 0 }}>{TEMPO_RULE}</p>
      </div>

      <div className="z2h-videos small">
        <b>Videos for this phase:</b> {p.course.map((c, i) => <span key={c.url}>{i ? ' · ' : ' '}<a href={c.url} target="_blank" rel="noreferrer">{c.label}</a></span>)}
      </div>

      {gate.length > 0 && (
        <div>
          <b>Gate {p.n}: pass all {gate.length} to move on</b>
          <ul className="goal-list">
            {gate.map(g => (
              <li key={g.id}>
                <button className={g.done ? 'done' : ''} onClick={() => g.target && launch(g.target)}>
                  <span className="plan-check">{g.done ? '✓' : ''}</span><span>{g.label}{g.auto ? <span className="small muted"> (the app saw it)</span> : null}</span>
                </button>
                {!g.auto && <button className="btn sm ghost" aria-pressed={v.ticks.includes(g.id)} onClick={() => set({ ...v, ticks: v.ticks.includes(g.id) ? v.ticks.filter(x => x !== g.id) : [...v.ticks, g.id] })}>{v.ticks.includes(g.id) ? 'Undo' : 'I can do it'}</button>}
              </li>
            ))}
          </ul>
          {passed && v.phase < PHASES.length && <button className="btn primary" onClick={() => set({ ...v, phase: v.phase + 1, since: Date.now(), lastGate: Date.now() })}>🎉 Gate passed: start Phase {v.phase + 1}</button>}
        </div>
      )}

      {monthly && (
        <div className="notice small">
          It's been 4 weeks: record yourself on this gate and compare with last month. Passed means next phase; not yet means keep going, which is normal.
          <div className="row" style={{ gap: 6, marginTop: 6 }}>
            <button className="btn sm" onClick={() => launch({ play: { open: 'options', focus: 'record' } })}>Record yourself</button>
            <button className="btn sm" onClick={onRecordings}>My recordings</button>
            <button className="btn sm ghost" onClick={() => set({ ...v, lastGate: Date.now() })}>Done</button>
          </div>
        </div>
      )}

      <div className="z2h-paths">
        <b>Style paths</b> <span className="small muted">go deep on a style alongside the phases{v.phase === 5 ? ' (this is Phase 5: pick one)' : ''}. Following one adds its next step to today's routine. Everything in them is also open on its own any time (Must-know licks, Exercises, Songbook, Jam).</span>
        {PATHS.map(pth => {
          const on = (v.paths ?? []).includes(pth.id)
          return (
            <div key={pth.id} className={`z2h-path${on ? ' on' : ''}`}>
              <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
                <span><b>{pth.title}</b> <span className="small muted">{pth.who}</span></span>
                <button className={`btn sm${on ? '' : ' primary'}`} onClick={() => set({ ...v, paths: on ? (v.paths ?? []).filter(x => x !== pth.id) : [...(v.paths ?? []), pth.id] })}>{on ? 'Stop following' : 'Follow'}</button>
              </div>
              {on && (
                <>
                  <ul className="goal-list">
                    {pth.steps.map(st => {
                      const k = `ps:${pth.id}:${st.label}`, done = v.ticks.includes(k)
                      return (
                        <li key={st.label}>
                          <button className={done ? 'done' : ''} onClick={() => st.target && launch(st.target)}><span className="plan-check">{done ? '✓' : '›'}</span><span>{st.label}</span></button>
                          <button className="btn sm ghost" aria-pressed={done} onClick={() => set({ ...v, ticks: done ? v.ticks.filter(x => x !== k) : [...v.ticks, k] })}>{done ? 'Undo' : '✓'}</button>
                        </li>
                      )
                    })}
                  </ul>
                  <span className="small"><b>You've got it when you can:</b></span>
                  <ul className="goal-list">
                    {pth.gate.map(g => {
                      const done = v.ticks.includes(g.id)
                      return (
                        <li key={g.id}>
                          <button className={done ? 'done' : ''} disabled><span className="plan-check">{done ? '✓' : ''}</span><span>{g.label}</span></button>
                          <button className="btn sm ghost" aria-pressed={done} onClick={() => set({ ...v, ticks: done ? v.ticks.filter(x => x !== g.id) : [...v.ticks, g.id] })}>{done ? 'Undo' : 'I can do it'}</button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          )
        })}
      </div>

      <p className="small z2h-rule" style={{ margin: 0 }}><b>{rule[0]}.</b> {rule[1]}</p>

      <button className="btn sm ghost" onClick={() => setAll(!all)}>{all ? 'Hide the whole plan' : 'See the whole plan'}</button>
      {all && (
        <ol className="stage-list small">
          {PHASES.map(x => (
            <li key={x.n} className={x.n < v.phase ? 'done' : x.n === v.phase ? 'on' : ''}>
              <b>Phase {x.n}: {x.title}</b> <span className="muted">({x.when})</span>
              <div className="muted">{(x.weeks ? x.weeks.flatMap(w => w.focus) : x.focus).map(f => f.label).join(' · ')}</div>
              {x.n !== v.phase && <button className="btn sm ghost" onClick={() => set({ ...v, phase: x.n, since: Date.now() })}>Go to this phase</button>}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
