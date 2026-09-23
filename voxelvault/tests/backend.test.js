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
  assert.equal(storageFor('image',4_999_999),'supabase');
  for(const size of [5_000_000,5_000_001,50_000_000]) assert.throws(()=>storageFor('image',size),/smaller than 5 MB/);
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
    await pg.exec(await readFile(new URL('../supabase/migrations/202609220003_profile_covers.sql',import.meta.url),'utf8'));
    const cover=randomUUID();await reserve(cover,80,'image');
    await pg.query("update public.upload_sessions set status='ready',created_at=now()-interval '25 hours' where id=$1",[cover]);
    const saveCover=(asUser,version,photo,banner)=>pg.query('select public.save_profile($1,$2,$3,$4,$5,$6,$7)',[asUser,'Name','Bio','VN',photo,banner,version]);
    await assert.rejects(saveCover(other,0,null,cover),/Invalid cover/);
    await saveCover(owner,2,cover,cover);
    await saveCover(owner,3,null,cover);
    assert.equal((await pg.query('select * from public.claim_cleanup($1)',[owner])).rows.some(row=>row.id===cover),false);
    await assert.rejects(pg.query('update public.upload_sessions set post_id=$1 where id=$2',[avatarPost,cover]),/Profile images cannot/);
    await saveCover(owner,4,null,null);
    assert.equal((await pg.query('select * from public.claim_cleanup($1)',[owner])).rows.some(row=>row.id===cover),true);
    await pg.exec(await readFile(new URL('../supabase/migrations/202609220004_image_feed.sql',import.meta.url),'utf8'));
    for(let n=0;n<65;n++) {
      const imageId=randomUUID();await reserve(imageId,10,'image');
      await pg.query("update public.upload_sessions set status='ready',post_id=$1 where id=$2",[avatarPost,imageId]);
      await pg.query('insert into public.post_images(post_id,upload_id,position,alt) values($1,$2,$3,$4)',[avatarPost,imageId,n,'Image '+n]);
    }
    const seed=randomUUID();
    const first=(await pg.query("select * from public.image_feed($1,'','','',30)",[seed])).rows;
    const again=(await pg.query("select * from public.image_feed($1,'','','',30)",[seed])).rows;
    assert.deepEqual(first,again);
    const second=(await pg.query("select * from public.image_feed($1,$2,'','',30)",[seed,first.at(-1).sort_key])).rows;
    const last=(await pg.query("select * from public.image_feed($1,$2,'','',30)",[seed,second.at(-1).sort_key])).rows;
    assert.equal(new Set([...first,...second,...last].map(row=>row.image_id)).size,65);
    assert.equal((await pg.query("select * from public.image_feed($1,'','unknown','',30)",[seed])).rows.length,0);
    assert.equal((await pg.query("select * from public.image_feed($1,'','','Avatar',30)",[seed])).rows.length,30);
    await pg.exec('set role anon');
    await assert.rejects(pg.query("select * from public.image_feed($1,'','','',30)",[seed]),/permission denied/);
    await pg.exec('reset role');
    await pg.exec(await readFile(new URL('../supabase/migrations/202609230005_unused_upload_deletion.sql',import.meta.url),'utf8'));
    const unused=randomUUID();await reserve(unused,40,'image');
    const claim=(asOwner,id)=>pg.query('select * from public.claim_unused_upload($1,$2)',[asOwner,id]);
    await assert.rejects(claim(owner,unused),/still uploading/);
    await pg.query("update public.upload_sessions set status='ready' where id=$1",[unused]);
    await assert.rejects(claim(other,unused),/not found/);
    await assert.rejects(claim(owner,first[0].image_id),/in use/);
    await saveCover(owner,5,unused,unused);
    await assert.rejects(claim(owner,unused),/in use/);
    await saveCover(owner,6,null,null);
    assert.equal((await claim(owner,unused)).rows[0].status,'deleting');
    assert.equal((await claim(owner,unused)).rows[0].status,'deleting');
    const before=Number((await pg.query('select sum(size_bytes) as used from public.upload_sessions where owner_id=$1',[owner])).rows[0].used);
    const fresh=randomUUID();await reserve(fresh,30,'image');
    await pg.query("update public.upload_sessions set status='ready' where id=$1",[fresh]);
    await claim(owner,fresh);
    assert.equal(Number((await pg.query('select sum(size_bytes) as used from public.upload_sessions where owner_id=$1',[owner])).rows[0].used),before+30);
    await pg.exec('set role authenticated');
    await assert.rejects(claim(owner,fresh),/permission denied/);
  } finally { await pg.close(); }
});
