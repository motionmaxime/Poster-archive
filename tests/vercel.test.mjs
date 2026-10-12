import test from 'node:test';
import assert from 'node:assert/strict';
import { authorized, sameOrigin, protect } from '../lib/security.js';
import { validDetails, makePath, fromBlob } from '../lib/posters.js';
import handler from '../api/posters.js';
import uploadHandler from '../api/upload.js';
import { readFile } from 'node:fs/promises';
function response() {
    return {code:200, headers:{}, body:null, setHeader(k,v){this.headers[k]=v;}, status(c){this.code=c;return this;}, json(b){this.body=b;return this;}, send(b){this.body=b;return this;}, end(){return this;}};
}
test('authentication fails closed and accepts only configured admin', () => {
    const previous=process.env.POSTER_ADMIN_PASSWORD;
    try {
        delete process.env.POSTER_ADMIN_PASSWORD;
        assert.equal(authorized({headers:{authorization:'Basic '+Buffer.from('admin:').toString('base64')}}),false);
        const res=response(); assert.equal(protect({headers:{}},res),false); assert.equal(res.code,503);
        process.env.POSTER_ADMIN_PASSWORD='test-password';
        for (const input of ['admin:wrong','other:test-password','admin:test-password']) {
            assert.equal(authorized({headers:{authorization:'Basic '+Buffer.from(input).toString('base64')}}),input==='admin:test-password');
        }
    } finally {if(previous===undefined) delete process.env.POSTER_ADMIN_PASSWORD; else process.env.POSTER_ADMIN_PASSWORD=previous;}
});
test('reject cross origin writes', () => {
    assert.equal(sameOrigin({headers:{host:'archive.example',origin:'https://archive.example'}}),true);
    assert.equal(sameOrigin({headers:{host:'archive.example',origin:'https://evil.example'}}),false);
    assert.equal(sameOrigin({headers:{host:'archive.example'}}),false);
});
test('poster paths preserve Unicode names and exact dates', () => {
    const pathname=makePath('Été / affiche #1','2026-10-12','image/png');
    const poster=fromBlob({pathname,url:'https://example.com/image.png'});
    assert.equal(poster.name,'Été / affiche #1'); assert.equal(poster.date,'2026-10-12');
    assert.notEqual(pathname,makePath('Été / affiche #1','2026-10-12','image/png'));
    assert.throws(()=>fromBlob({pathname:'posters/v1/../../bad',url:''}));
    assert.equal(validDetails('X','2026-02-30'),false);
    assert.equal(validDetails(' ','2026-02-20'),false);
    assert.throws(()=>makePath('X','2026-02-20','image/svg+xml'));
});
test('unconfigured storage still serves initial posters but refuses upload', async () => {
    const previous=process.env.BLOB_READ_WRITE_TOKEN; delete process.env.BLOB_READ_WRITE_TOKEN;
    try {
        const res=response(); await handler({method:'GET',headers:{}},res);
        assert.equal(res.code,200); assert.equal(res.body.length,6); assert.ok(res.body.some(p=>p.name==='Free'));
        const upload=response(); await uploadHandler({method:'POST',headers:{}},upload);
        assert.equal(upload.code,503);
    } finally {if(previous!==undefined) process.env.BLOB_READ_WRITE_TOKEN=previous;}
});
test('public build excludes private files and keeps admin behind function', async () => {
    const {readdir}=await import('node:fs/promises');
    const files=await readdir('public');
    for(const name of ['.env','server.py','data','admin.html']) assert.ok(!files.includes(name));
    const config=JSON.parse(await readFile('vercel.json'));
    assert.ok(config.rewrites.some(r=>r.source==='/admin.html' && r.destination==='/api/admin'));
    assert.ok(files.includes('admin.js')); assert.ok(files.includes('posters.json'));
});
