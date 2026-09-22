import assert from 'node:assert/strict';

// Read central-directory offsets instead of assuming local headers omit descriptors.
export function readStoredZip(bytes) {
  assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);
  const count=bytes.readUInt16LE(bytes.length-12);
  let offset=bytes.readUInt32LE(bytes.length-6);
  const files=new Map();
  for(let i=0;i<count;i++) {
    assert.equal(bytes.readUInt32LE(offset),0x02014b50);
    assert.equal(bytes.readUInt16LE(offset+10),0);
    const size=bytes.readUInt32LE(offset+20),nameLength=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32),local=bytes.readUInt32LE(offset+42);
    const name=bytes.subarray(offset+46,offset+46+nameLength).toString('utf8');
    const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
    files.set(name,bytes.subarray(start,start+size));
    offset+=46+nameLength+extra+comment;
  }
  return files;
}
