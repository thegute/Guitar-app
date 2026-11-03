import './test-env'
import { strict as assert } from 'node:assert'
import { countUse, usageRows, untouched, clearUsage, KNOWN } from '../src/usage'

clearUsage()
countUse('screen:play'); countUse('screen:play'); countUse('tool:tuner'); countUse('btn:play:Hear it')
const rows = usageRows()
assert.equal(rows[0].id, 'screen:play'); assert.equal(rows[0].n, 2); assert.equal(rows[0].label, 'Play')
assert.ok(rows.find(r => r.id === 'btn:play:Hear it')?.label.includes('Hear it'))
const cold = untouched(30).map(r => r.id)
assert.ok(!cold.includes('screen:play') && cold.includes('screen:songs'))
assert.equal(untouched(30).length, Object.keys(KNOWN).length - 2)
console.log('usage: ok')
