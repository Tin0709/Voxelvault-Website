import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';

test('cloud drafts: ownership, conflicts, cleanup protection, quota and image storage routing',async()=>{
 const pg=new PGlite();
 try{
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create schema storage;
   create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
   create function auth.uid() returns uuid language sql stable as $$select null::uuid$$;
   create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  for(const name of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')).sort())await pg.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
  const owner=randomUUID(),other=randomUUID(),draft=randomUUID(),image=randomUUID();
  await pg.query('insert into auth.users(id) values($1),($2)',[owner,other]);
  assert.equal(Number((await pg.query('select quota_bytes from public.storage_accounts where owner_id=$1',[owner])).rows[0].quota_bytes),250000000);
  await pg.query('select public.prepare_draft($1,$2)',[owner,draft]);
  await assert.rejects(pg.query('select public.prepare_draft($1,$2)',[other,draft]),/unavailable/);
  await pg.query("select public.reserve_draft_upload($1,$2,'draft.png','image/png',100,'image',$3)",[owner,image,draft]);
  await pg.query("update public.upload_sessions set status='ready',created_at=now()-interval '2 days' where id=$1",[image]);
  assert.equal((await pg.query('select bucket from public.upload_sessions where id=$1',[image])).rows[0].bucket,'attachments');
  await pg.query("select public.save_draft($1,$2,0,'{}',array[$3::uuid])",[owner,draft,image]);
  await assert.rejects(pg.query("select public.save_draft($1,$2,0,'{}',array[$3::uuid])",[owner,draft,image]),/changed/);
  await assert.rejects(pg.query("select public.save_draft($1,$2,1,'{}',array[$3::uuid])",[other,draft,image]),/changed/);
  await assert.rejects(pg.query('select public.claim_unused_upload($1,$2)',[owner,image]),/in use/);
  assert.equal((await pg.query('select * from public.claim_cleanup($1)',[owner])).rows.length,0);
  await pg.query("update public.upload_sessions set status='deleting' where id=$1",[image]);
  assert.equal((await pg.query('select status from public.upload_sessions where id=$1',[image])).rows[0].status,'ready');
  // Pending and deleting reservations must count, so simultaneous uploads cannot exceed 50 MB on Supabase.
  for(let i=0;i<10;i++)await pg.query("select public.reserve_upload($1,$2,'img','image/png',4999990,'image')",[owner,randomUUID()]);
  const overflow=randomUUID();await pg.query("select public.reserve_upload($1,$2,'img','image/png',100,'image')",[owner,overflow]);
  assert.equal((await pg.query('select provider from public.upload_sessions where id=$1',[overflow])).rows[0].provider,'r2');
  for(let i=0;i<3;i++)await pg.query("select public.reserve_upload($1,$2,'large','application/octet-stream',50000000,'attachment')",[owner,randomUUID()]);
  await assert.rejects(pg.query("select public.reserve_upload($1,$2,'large','application/octet-stream',50000000,'attachment')",[owner,randomUUID()]),/quota/);
  await pg.query('select public.delete_draft($1,$2)',[owner,draft]);
  assert.equal((await pg.query('select status from public.upload_sessions where id=$1',[image])).rows[0].status,'deleting');
  assert.ok((await pg.query('select * from public.claim_cleanup($1)',[owner])).rows.some(r=>r.id===image));
  // Feed mode returns one cover per post while the original mode retains each image.
  const post=randomUUID(),first=randomUUID(),second=randomUUID();
  for(const id of [first,second]){await pg.query("select public.reserve_upload($1,$2,'img','image/png',10,'image')",[other,id]);await pg.query("update public.upload_sessions set status='ready' where id=$1",[id]);}
  await pg.query("select public.save_post($1,$2,0,$3,$4,'[]','[]')",[other,post,JSON.stringify({title:'Test',description:'World',category:'art',location:'',minecraftVersion:'',revisionNotes:'',originalCreator:'',originalSource:'',creditUrl:''}),JSON.stringify([{id:first},{id:second}])]);
  assert.equal((await pg.query("select * from public.image_feed('seed')")).rows.length,2);
  assert.equal((await pg.query("select * from public.post_feed('seed')")).rows.length,1);
  await pg.exec('set role authenticated');
  await assert.rejects(pg.query('select * from public.drafts'),/permission denied/);
 }finally{await pg.close();}
});
