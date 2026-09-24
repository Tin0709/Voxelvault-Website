import test from 'node:test';
import assert from 'node:assert/strict';
import {randomPostWave} from '../src/lib/randomPostWave.js';
const posts=Array.from({length:12},(_,id)=>({id,title:`Post ${id}`}));
test('waves prefer four different posts and leave the source intact',()=>{
 const previous=posts.slice(0,4);
 const next=randomPostWave(posts,previous,4,()=>.5);
 assert.equal(next.length,4);
 assert.equal(new Set(next.map(p=>p.id)).size,4);
 assert.ok(next.every(p=>!previous.includes(p)));
 assert.deepEqual(posts.map(p=>p.id),Array.from({length:12},(_,i)=>i));
});
test('small pools stay unique and change order rather than repeat the same wave',()=>{
 const pool=posts.slice(0,3);
 const next=randomPostWave([...pool,pool[0]],pool,4,()=>.999);
 assert.equal(next.length,3);
 assert.equal(new Set(next.map(p=>p.id)).size,3);
 assert.notDeepEqual(next,pool);
});
test('empty and single-post pools are safe',()=>{
 assert.deepEqual(randomPostWave([]),[]);
 assert.deepEqual(randomPostWave([posts[0]],[posts[0]]),[posts[0]]);
});
