const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const root=path.resolve(__dirname,'..'),branding=path.join(root,'public/branding');
test('official originals remain unchanged and generated icon dimensions and formats are valid',()=>{
for(const [name,hash] of [['east-west-hub-logo.png','fdaed5c4be472399391397b4d182d080fcedaa17c015b4c97aded27d33e8508d'],['east-west-hub-icon.png','f92c7b740ce605f45e0fd979d1a5bc0ea64c25f1ae9070f1b776ddf85d38a792']])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(branding,name))).digest('hex'),hash);
for(const size of [16,32,180,192,512]){const b=fs.readFileSync(path.join(branding,`icon-${size}.png`));assert.equal(b.toString('ascii',1,4),'PNG');assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);assert.equal(b[25],6,'RGBA transparency retained');}
const ico=fs.readFileSync(path.join(branding,'favicon.ico'));assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),3);assert.deepEqual([0,1,2].map(i=>ico[6+i*16]),[16,32,48]);
});
test('document and mobile manifest reference shipped official symbol assets',()=>{
const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');for(const name of ['favicon.ico','icon-16.png','icon-32.png','icon-180.png','site.webmanifest'])assert.ok(html.includes(`/branding/${name}`));assert.ok(!html.includes('href="favicon.ico"'));
const manifest=JSON.parse(fs.readFileSync(path.join(branding,'site.webmanifest'),'utf8'));assert.equal(manifest.name,'East West Hub');assert.deepEqual(manifest.icons.map(i=>i.sizes),['192x192','512x512']);for(const icon of manifest.icons)assert.ok(fs.existsSync(path.join(root,'public',icon.src)));
});

test('active public and admin branding use original text rather than full-logo images',()=>{
const publicHtml=fs.readFileSync(path.join(root,'src/app/pages/public-layout.component.html'),'utf8');
const adminHtml=fs.readFileSync(path.join(root,'src/app/admin/admin-shell.component.html'),'utf8');
assert.ok(publicHtml.includes('class="brand-symbol"'));assert.ok(publicHtml.includes('class="footer-wordmark"'));assert.ok(adminHtml.includes('<strong>EW<span>↔</span></strong>'));
assert.ok(!publicHtml.includes('official-logo'));assert.ok(!adminHtml.includes('cms-official-logo'));
});
test('only development build copies unpublished local media',()=>{
const a=JSON.parse(fs.readFileSync(path.join(root,'angular.json'),'utf8')).projects['east-west-hub-web'].architect;
assert.ok(a.build.configurations.development.assets.some(x=>x.output==='local-hero-preview'));
assert.ok(!a.build.options.assets.some(x=>x.output==='local-hero-preview'));
assert.equal(a.serve.defaultConfiguration,'development');assert.equal(a.serve.options.port,4330);
});
