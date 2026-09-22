import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Writable,Readable} from 'node:stream';
import {archiveNames,streamArchive,safeFilename} from '../server/archive.js';
import {readStoredZip} from './zip-reader.js';

test('ZIP preserves file bytes, Unicode names, and safely disambiguates entries',async()=>{
  const files=[{original_name:'world.zip'},{original_name:'WORLD.zip'},{original_name:'../x\\file.txt'},{original_name:'hình ảnh.png'}];
  const names=archiveNames(files);
  assert.equal(new Set(names.map(n=>n.toLowerCase())).size,4);
  assert.ok(names.every(n=>!/[\\/]/.test(n)));
  assert.equal(safeFilename('...'),'file');
  const parts=[];
  const output=new Writable({write(chunk,encoding,done){parts.push(chunk);done();}});
  await streamArchive(output,files,async file=>Readable.from([Buffer.from(file.original_name)]));
  const parsed=readStoredZip(Buffer.concat(parts));
  for(const [i,file]of files.entries())assert.equal(parsed.get(names[i]).toString(),file.original_name);
});
test('ZIP source errors reject rather than silently omitting a file',async()=>{
  const output=new Writable({write(chunk,encoding,done){done();}});
  await assert.rejects(streamArchive(output,[{original_name:'missing.bin'}],async()=>{throw new Error('Storage unavailable');}),/Storage unavailable/);
});
