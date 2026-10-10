const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const output=process.env.STAGING_FUNCTIONS_BUILD;
const proxy=require(path.join(output,'api/[[path]].js')).onRequest;
const middleware=require(path.join(output,'_middleware.js')).onRequest;
const robots=require(path.join(output,'robots.txt.js')).onRequest;
const env={API_BASE_URL:'https://api.example.test'};

test('proxy forwards the same API path, query, body and bearer token, without cookies or spoofed IP headers',async()=>{
  const original=global.fetch;
  global.fetch=async(url,options)=>{
    assert.equal(url.href,'https://api.example.test/api/admin/videos?lang=ar');assert.equal(options.method,'PUT');
    assert.equal(options.headers.get('authorization'),'Bearer test-token');assert.equal(options.headers.get('cookie'),null);
    assert.equal(options.headers.get('x-forwarded-for'),null);assert.equal(options.headers.get('host'),null);
    assert.equal(options.redirect,'manual');assert.equal(new TextDecoder().decode(options.body),'{"title":"Edited"}');
    return new Response('{"ok":true}',{status:200,headers:{'Content-Type':'application/json','Set-Cookie':'private=value'}});
  };
  try{
    const result=await proxy({env,request:new Request('https://preview.example.test/api/admin/videos?lang=ar',{method:'PUT',headers:{Authorization:'Bearer test-token',Cookie:'session=private','X-Forwarded-For':'spoof','Content-Type':'application/json'},body:'{"title":"Edited"}'})});
    assert.equal(result.status,200);assert.equal(result.headers.get('set-cookie'),null);assert.equal(result.headers.get('cache-control'),'no-store');
  }finally{global.fetch=original;}
});
test('proxy rejects missing, insecure, credential-bearing or path-based API origins',async()=>{
  for(const origin of [undefined,'http://api.example.test','https://user:password@api.example.test','https://api.example.test/api'])
    assert.equal((await proxy({env:{API_BASE_URL:origin},request:new Request('https://preview.example.test/api/admin/videos')})).status,503);
});
test('proxy rejects path escape, unsupported method and oversized bodies',async()=>{
  assert.equal((await proxy({env,request:new Request('https://preview.example.test/api/%2foutside')})).status,400);
  assert.equal((await proxy({env,request:new Request('https://preview.example.test/api/videos',{method:'PROPFIND'})})).status,405);
  assert.equal((await proxy({env,request:new Request('https://preview.example.test/api/videos',{method:'POST',body:'x'.repeat(1_048_577)})})).status,413);
});
test('proxy preserves auth failures and handles redirects or unavailable API without leaking details',async()=>{
  const original=global.fetch;
  try{
    for(const status of [401,403,409,429]){global.fetch=async()=>new Response('{}',{status});assert.equal((await proxy({env,request:new Request('https://preview.example.test/api/admin/videos')})).status,status);}
    global.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://other.example.test'}});
    assert.equal((await proxy({env,request:new Request('https://preview.example.test/api/admin/videos')})).status,502);
    global.fetch=async()=>{throw new Error('private upstream detail')};
    const response=await proxy({env,request:new Request('https://preview.example.test/api/admin/videos')});assert.equal(response.status,502);assert.ok(!(await response.text()).includes('private upstream'));
  }finally{global.fetch=original;}
});
test('staging returns noindex headers and robots disallow, while non-staging retains normal robots',async()=>{
  const request=new Request('https://preview.example.test/ar');
  const response=await middleware({request,env:{STAGING_NOINDEX:'true'},next:async()=>new Response('site')});
  assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow, noarchive');
  assert.match(await robots({request,env:{STAGING_NOINDEX:'true'}}).text(),/Disallow: \/\n/);
  assert.match(await robots({request,env:{STAGING_NOINDEX:'false'}}).text(),/Sitemap:/);
});

