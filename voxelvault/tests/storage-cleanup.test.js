import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanUnusedUploads} from '../src/lib/storageCleanup.js';
test('bulk cleanup excludes in-use uploads, deduplicates and reports partial failures',async()=>{
  const items=[{id:'a',group:'unattached',bytes:10},{id:'a',group:'unattached',bytes:10},{id:'b',name:'busy.png',group:'unattached',bytes:20},{id:'c',group:'deleting',bytes:30},...['postImages','profileImages','attachments','pending'].map(group=>({id:group,group,bytes:100}))];
  const called=[],progress=[];
  const result=await cleanUnusedUploads(items,async id=>{called.push(id);if(id==='a')items.push({id:'new-upload',group:'unattached',bytes:99});if(id==='b')throw new Error('Now attached');},(done,total)=>progress.push([done,total]));
  assert.deepEqual(called,['a','b','c']);
  assert.equal(result.bytes,40);assert.equal(result.deleted,2);
  assert.deepEqual(result.failures,[{id:'b',name:'busy.png',message:'Now attached'}]);
  assert.deepEqual(progress,[[1,3],[2,3],[3,3]]);
});
