import test from 'node:test';
import assert from 'node:assert/strict';
import {storageReport} from '../server/storage-report.js';
test('storage breakdown counts each upload once, including shared profile images and reservations',()=>{
  const row=(id,status,post_id,kind,size_bytes)=>({id,status,post_id,kind,size_bytes,original_name:id,provider:'supabase'});
  const report=storageReport([
    row('shared','ready',null,'image','10'),row('post','ready','p','image',20),
    row('file','ready','p','attachment',30),row('unused','ready',null,'image',40),
    row('reserved','pending',null,'attachment',50),row('deleted','deleting',null,'image',60),
  ],{avatar_upload_id:'shared',cover_upload_id:'shared'},200);
  assert.equal(report.usedBytes,210);
  assert.equal(report.groups.profileImages.bytes,10);
  assert.equal(report.groups.unattached.bytes,40);
  assert.equal(report.groups.pending.bytes,50);
  assert.equal(report.groups.deleting.bytes,60);
  assert.equal(Object.values(report.groups).reduce((n,g)=>n+g.bytes,0),report.usedBytes);
  assert.equal(report.items[0].id,'deleted');
});
