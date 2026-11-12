// The Shorts feed's rules: guitar only, no djent / math rock, his styles boosted, shuffled, and no channel twice in 10.
import './test-env'
import { strict as assert } from 'node:assert'
import { curate, defaultsPending, rankTabChannels, shuffle, spreadChannels, unfollow, type Short } from '../src/scan/shorts'

let checks = 0
const ok = (c: boolean, m: string) => { checks++; assert.ok(c, m) }
let seed = 3
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
const S = (id: string, title: string, ch: string): Short => ({ id, title, channel: ch, channelId: ch, source: 'search' })

const a = Array.from({ length: 20 }, (_, i) => i)
const sh = shuffle(a, rnd)
ok(sh.length === 20 && new Set(sh).size === 20 && sh.join() !== a.join(), 'Fisher–Yates: every item once, new order')

// one busy channel: never twice within 10
const busy = [...Array.from({ length: 12 }, (_, i) => S(`b${i}`, 'guitar lick', 'BUSY')), ...Array.from({ length: 40 }, (_, i) => S(`o${i}`, 'guitar riff', `ch${i % 20}`))]
const spread = spreadChannels(busy)
let worst = 0
for (let i = 0; i < spread.length; i++) for (let j = i + 1; j < Math.min(spread.length, i + 10); j++) if (spread[i].channelId === spread[j].channelId) worst++
ok(worst === 0, 'no channel twice in any 10 in a row')

const list = [
  S('1', 'Plini style melodic prog lick #guitartabs', 'a'), S('2', 'DJENT riff of the day', 'b'), S('3', 'Math rock tapping riff', 'c'),
  S('4', 'Funny cat video', 'd'), S('5', 'Easy acoustic chord embellishments (tab)', 'e'), S('6', 'Slack key in taro patch tuning', 'f'),
  S('7', 'Pop song guitar chords', 'g'), S('8', 'Bluegrass flatpicking run', 'h'), S('9', 'guitar solo cover', 'i'), S('10', 'Billy Strings lick tab', 'j'),
  { ...S('11', 'New upload', 'k'), source: 'channels' },
]
const c = curate(list, rnd)
const ids = c.map(s => s.id)
ok(!ids.includes('2') && !ids.includes('3'), 'djent and math rock left out')
ok(!ids.includes('4'), 'not about guitar: left out')
ok(ids.includes('11'), "a followed channel's upload stays (he follows it for guitar)")
const styled = c.filter(s => s.style).length
ok(c.slice(0, 3).filter(s => s.style).length >= 2 && styled >= 5, `his styles come first-ish (${c.slice(0, 3).map(s => s.style ?? '-').join(', ')})`)
// Find channels for me: ranking channels by tabs on screen, titles and how often they turn up
{
  const sh = (id: string, title: string, ch: string, style = 'bluegrass') => ({ id, title, channel: ch, channelId: ch, source: 'search' as const, style })
  const pile = [
    sh('a1', 'Billy Strings lick #guitartabs', 'tabby'), sh('a2', 'Bluegrass G run tab', 'tabby'), sh('a3', 'Crosspicking lesson tabs', 'tabby', 'acoustic'),
    sh('b1', 'My new guitar vlog', 'vlogger'), sh('b2', 'Guitar unboxing day', 'vlogger'),
    sh('c1', 'Slack key in open G', 'onceonly', 'slack'),
    sh('d1', 'Riff of the day', 'pics'), sh('d2', 'Another riff', 'pics'),
    sh('e1', 'Riff', 'notab'), sh('e2', 'Riff 2', 'notab'),
  ]
  const tabs = new Map([['pics', { checked: 3, withTab: 3 }], ['notab', { checked: 3, withTab: 0 }]])
  const r = rankTabChannels(pile, tabs, new Set(['followedOne']))
  ok(r[0].id === 'pics' || r[0].id === 'tabby', `tab channels first (${r.map(x => x.id).join(',')})`)
  ok(!r.some(x => x.id === 'notab'), 'frames checked and no tab: left out')
  ok(!r.some(x => x.id === 'onceonly'), 'one Short and nothing seen: left out')
  ok(r.findIndex(x => x.id === 'vlogger') === -1 || r.findIndex(x => x.id === 'vlogger') > r.findIndex(x => x.id === 'tabby'), 'unboxing / vlog channel ranks below')
  ok(rankTabChannels(pile, tabs, new Set(['tabby'])).every(x => x.id !== 'tabby'), 'already followed: skipped')
  // the starting follows: removed stays removed
  localStorage.setItem('kg:shortsChannels', JSON.stringify([{ id: 'UCx', name: 'Mr. Tabs' }]))
  unfollow('UCx')
  ok(!defaultsPending().some(d => d.name === 'Mr. Tabs'), 'removing Mr. Tabs means it is not looked up again')
  ok(defaultsPending().length === 3, 'the other three are still to find')
  ok(defaultsPending().some(d => d.id === 'UC57CDvpwqAxHrJvVkZbaBxA'), 'GuitarZero2Hero Express is followed by its channel id')
}
console.log(`shorts feed: ${checks} checks, 0 failed`)
