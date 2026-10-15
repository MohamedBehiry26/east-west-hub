const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const output=process.env.STAGING_FUNCTIONS_BUILD;
const proxy=require(path.join(output,'api/[[path]].js')).onRequest;
const middleware=require(path.join(output,'_middleware.js')).onRequest;
const robots=require(path.join(output,'robots.txt.js')).onRequest;
const env={API_BASE_URL:'https://api.example.test'};

test('settings GET and PUT preserve the backend route, authorization and response status',async()=>{
  const original=global.fetch;
  try{
    for(const method of ['GET','PUT']) for(const status of [200,401,403,404]) {
      global.fetch=async(url,options)=>{
        assert.equal(url.href,'https://api.example.test/api/admin/settings');
        assert.equal(options.method,method);
        assert.equal(options.headers.get('authorization'),'Bearer test-token');
        if(method==='PUT') assert.equal(new TextDecoder().decode(options.body),'{"agencyNameEn":"Owner supplied"}');
        return new Response('{"socialLinks":[]}',{status,headers:{'Content-Type':'application/json'}});
      };
      const result=await proxy({env,request:new Request('https://preview.example.test/api/admin/settings',{
        method,headers:{Authorization:'Bearer test-token','Content-Type':'application/json'},
        ...(method==='PUT'?{body:'{"agencyNameEn":"Owner supplied"}'}:{})
      })});
      assert.equal(result.status,status);
      assert.deepEqual(await result.json(),{socialLinks:[]});
    }
  }finally{global.fetch=original;}
});

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


test('CSP permits secure native Hero media without relaxing scripts or frame policy',async()=>{
  const response=await middleware({request:new Request('https://preview.example.test/en'),env:{},next:async()=>new Response('site')});
  const policy=response.headers.get('content-security-policy');assert.match(policy,/media-src 'self' https:/);assert.match(policy,/script-src 'self';/);assert.match(policy,/frame-src https:\/\/www.youtube-nocookie.com/);
});

test('concurrency preconditions and typed 409/428 problems survive the API proxy',async()=>{
 const original=global.fetch;const version='a1111111-1111-4111-8111-111111111111';
 try{for(const method of ['PUT','DELETE'])for(const status of [409,428]){
  const suffix=method==='DELETE'?`?expectedVersion=${version}`:'';
  global.fetch=async(url,options)=>{assert.equal(url.href,'https://api.example.test/api/admin/videos/id'+suffix);if(method==='PUT')assert.deepEqual(JSON.parse(new TextDecoder().decode(options.body)),{expectedVersion:version});return new Response(JSON.stringify({code:status===409?'cms_concurrency_conflict':'cms_version_required'}),{status,headers:{'Content-Type':'application/problem+json'}});};
  const response=await proxy({env,request:new Request('https://preview.example.test/api/admin/videos/id'+suffix,{method,headers:{'Content-Type':'application/json'},...(method==='PUT'?{body:JSON.stringify({expectedVersion:version})}:{})})});assert.equal(response.status,status);assert.equal(response.headers.get('Content-Type'),'application/problem+json');assert.equal((await response.json()).code,status===409?'cms_concurrency_conflict':'cms_version_required');
 }}finally{global.fetch=original;}
});
