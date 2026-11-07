// One beat transport for the whole app: the beat maker, the 4-track looper and the looper bar on other screens all
// play on this clock, so loops and beat stay locked together wherever you are.
import { StudioTransport } from './transport'
import { loadBeat } from './beat'

let tr: StudioTransport | null = null
export function sharedTransport(): StudioTransport { return (tr ??= new StudioTransport(loadBeat())) }
export const hasTransport = () => !!tr
