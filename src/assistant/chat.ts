// The conversation with the helper: kept while the app is open, so you can close it, look at something and come back.
import type { Answer } from './plan'
export interface Turn { id: number; q: string; answer?: Answer }
let turns: Turn[] = []
let n = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(f => f())
export const chat = () => turns
export function onChat(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } }
export function addQuestion(q: string): number { const id = ++n; turns = [...turns.slice(-19), { id, q }]; emit(); return id }
export function answerTurn(id: number, a: Answer) { turns = turns.map(t => (t.id === id ? { ...t, answer: a } : t)); emit() }
export function clearChat() { turns = []; emit() }
/** The last few exchanges, for follow-up questions ("and in A minor?"). */
export const history = () => turns.filter(t => t.answer).slice(-4).map(t => ({ q: t.q, a: t.answer!.reply }))
