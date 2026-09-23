import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createId} from '../src/lib/createId.js';
import {requireUuid} from '../server/validation.js';
test('LAN HTTP fallback creates valid random UUID v4 IDs without randomUUID',()=>{
 const provider={getRandomValues:bytes=>webcrypto.getRandomValues(bytes)};
 const ids=Array.from({length:1000},()=>createId(provider));
 for(const id of ids){assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);assert.equal(requireUuid(id),id);}
 assert.equal(new Set(ids).size,ids.length);
 assert.equal(createId({getRandomValues:bytes=>bytes.fill(255)}),'ffffffff-ffff-4fff-bfff-ffffffffffff');
});
test('secure contexts retain native UUID generation; unavailable crypto fails clearly',()=>{
 const provider={randomUUID(){assert.equal(this,provider);return 'native-id';}};
 assert.equal(createId(provider),'native-id');
 assert.throws(()=>createId({}),/cannot generate secure IDs/);
});
