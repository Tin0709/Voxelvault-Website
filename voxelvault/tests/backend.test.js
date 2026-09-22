import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { storageFor, validatePost } from '../server/validation.js';

test('storage thresholds and untrusted request validation', () => {
  assert.equal(storageFor('attachment',5_000_000),'supabase');
  assert.equal(storageFor('attachment',5_000_001),'r2');
  assert.equal(storageFor('attachment',50_000_000),'r2');
  assert.equal(storageFor('image',50_000_000),'supabase');
  for (const size of [-1,NaN,1.5,50_000_001]) assert.throws(()=>storageFor('attachment',size));
  assert.throws(()=>storageFor('other',1));
  const body = {title:' Test ',category:'art',version:0,images:[{id:randomUUID()}],attachments:[],externalDownloads:[]};
  assert.equal(validatePost(body).title,'Test');
  assert.throws(()=>validatePost({...body,creditUrl:'javascript:alert(1)'}));
  assert.throws(()=>validatePost({...body,attachments:body.images}));
  assert.throws(()=>validatePost({...body,externalDownloads:[{name:'file',url:'file:///secret'}]}));
});

test('migration, owner isolation, quota, publish, deletion and orphan cleanup', async () => {
  const pg = new PGlite();
  try {
    // Supabase-managed schemas/roles are stubbed, application SQL is executed unchanged.
    await pg.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated;
      grant execute on function auth.uid() to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    `);
    await pg.exec(await readFile(new URL('../supabase/migrations/202609220001_initial.sql',import.meta.url),'utf8'));
    const owner=randomUUID(), other=randomUUID(), image=randomUUID(), attachment=randomUUID(), post=randomUUID();
    await pg.query('insert into auth.users(id) values ($1),($2)',[owner,other]);
    assert.equal((await pg.query('select count(*)::int n from public.posts')).rows[0].n,0);
    assert.equal((await pg.query('select count(*)::int n from public.upload_sessions')).rows[0].n,0);
    async function reserve(id,size,kind='attachment') {
      return pg.query('select * from public.reserve_upload($1,$2,$3,$4,$5,$6)',[owner,id,'test.bin','application/octet-stream',size,kind]);
    }
    await reserve(image,100,'image'); await reserve(attachment,5000001);
    assert.equal((await pg.query('select provider from public.upload_sessions where id=$1',[attachment])).rows[0].provider,'r2');
    await pg.query('update public.storage_accounts set quota_bytes=5000200 where owner_id=$1',[owner]);
    await assert.rejects(reserve(randomUUID(),100),/quota exceeded/);
    await assert.rejects(reserve(randomUUID(),50000001),/Invalid upload/);
    await pg.exec("update public.upload_sessions set status='ready'");
    const content = {title:'Test',description:'',category:'art',location:'',minecraftVersion:'',revisionNotes:'',originalCreator:'Someone else',originalSource:'',creditUrl:''};
    async function save(asUser,version=0,images=[{id:image}]) {
      return pg.query('select public.save_post($1,$2,$3,$4,$5,$6,$7)',[asUser,post,version,JSON.stringify(content),JSON.stringify(images),JSON.stringify([{id:attachment}]),JSON.stringify([{name:'Backup',url:'https://example.com/private'}])]);
    }
    await assert.rejects(save(other),/Invalid image/);
    await save(owner);
    await assert.rejects(save(other,1),/access denied/);
    await assert.rejects(save(owner,0),/Post changed/);
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
    await pg.exec('set role authenticated');
    assert.equal((await pg.query('select count(*)::int n from public.posts')).rows[0].n,1);
    for (const table of ['attachments','external_downloads','upload_sessions']) {
      assert.equal((await pg.query(`select count(*)::int n from public.${table}`)).rows[0].n,0);
    }
    await assert.rejects(pg.query('delete from public.posts'),/permission denied/);
    await assert.rejects(pg.query('select public.delete_post($1,$2)',[owner,post]),/permission denied/);
    await pg.exec('reset role');
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[owner]);
    await pg.exec('set role authenticated');
    assert.equal((await pg.query('select count(*)::int n from public.external_downloads')).rows[0].n,1);
    await pg.exec('reset role');
    await assert.rejects(pg.query('select public.delete_post($1,$2)',[other,post]),/Access denied/);
    await pg.query('select public.delete_post($1,$2)',[owner,post]);
    assert.equal((await pg.query('select count(*)::int n from public.posts')).rows[0].n,0);
    assert.equal((await pg.query('select * from public.claim_cleanup($1)',[owner])).rows.length,2);
    // Quota is not freed until the storage deletion has succeeded.
    await assert.rejects(reserve(randomUUID(),100),/quota exceeded/);
    await pg.exec("delete from public.upload_sessions where status='deleting'");
    const orphan=randomUUID(); await reserve(orphan,10);
    await pg.exec("update public.upload_sessions set created_at=now()-interval '25 hours'");
    assert.equal((await pg.query('select * from public.claim_cleanup($1)',[owner])).rows[0].status,'deleting');
    await pg.exec(await readFile(new URL('../supabase/migrations/202609220002_profiles.sql',import.meta.url),'utf8'));
    const avatar=randomUUID(); await reserve(avatar,80,'image');
    await pg.query("update public.upload_sessions set status='ready',created_at=now()-interval '25 hours' where id=$1",[avatar]);
    const profileSave=(asUser,version,photo=avatar)=>pg.query('select public.save_profile($1,$2,$3,$4,$5,$6)',[asUser,'New name','My bio','VN',photo,version]);
    await assert.rejects(profileSave(other,0),/Invalid avatar/);
    await profileSave(owner,0);
    const profile=(await pg.query('select * from public.profiles where id=$1',[owner])).rows[0];
    assert.equal(profile.name,'New name'); assert.equal(profile.country,'VN'); assert.equal(profile.avatar_upload_id,avatar);
    await assert.rejects(profileSave(owner,0),/Profile changed/);
    assert.equal((await pg.query('select * from public.claim_cleanup($1)',[owner])).rows.some(row=>row.id===avatar),false);
    const avatarPost=randomUUID();
    await pg.query("insert into public.posts(id,owner_id,title) values($1,$2,'Avatar isolation')",[avatarPost,owner]);
    await assert.rejects(pg.query('update public.upload_sessions set post_id=$1 where id=$2',[avatarPost,avatar]),/Avatar cannot/);
    await pg.exec('set role authenticated');
    await assert.rejects(profileSave(owner,1),/permission denied/);
    await assert.rejects(pg.query("update public.profiles set name='Other'"),/permission denied/);
    await pg.exec('reset role');
    await profileSave(owner,1,null);
    assert.equal((await pg.query('select * from public.claim_cleanup($1)',[owner])).rows.some(row=>row.id===avatar),true);
  } finally { await pg.close(); }
});
