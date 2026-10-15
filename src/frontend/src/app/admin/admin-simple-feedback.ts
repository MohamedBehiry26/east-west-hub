import { FormControl, Validators } from '@angular/forms';
type Errors=Record<string,string[]>;
function limits(values:Record<string,any>,bounds:Record<string,number>):Errors {const errors:Errors={};for(const [key,max] of Object.entries(bounds))if(typeof values[key]==='string'&&values[key].length>max)errors[key]=['length'];return errors;}
function integer(value:unknown):boolean{return Number.isInteger(value)&&Number(value)>=-2147483648&&Number(value)<=2147483647;}
function absoluteUrl(value:string):boolean {try{const url=new URL(value);return ['http:','https:','ftp:'].includes(url.protocol)&&!!url.hostname;}catch{return false;}}
export function categoryFeedback(m:Record<string,any>):Errors {
  const e=limits(m,{nameEn:160,nameAr:160,slugEn:180,slugAr:180});for(const key of ['nameEn','nameAr','slugEn','slugAr'])if(!String(m[key]??'').trim())e[key]=['required'];
  if((m['imageUrl']?.length ?? 0)>2048)e['image']=['length'];else if(m['imageUrl']?.trim()&&!absoluteUrl(m['imageUrl']))e['image']=['url'];if(!integer(m['displayOrder']))e['order']=['invalid'];return e;
}
export function settingsFeedback(m:Record<string,any>):Errors {
  const e=limits(m,{agencyNameEn:160,agencyNameAr:160,agencyDescriptionEn:2000,agencyDescriptionAr:2000,addressEn:500,addressAr:500,email:320,phone:40,logoUrl:2048,faviconUrl:2048,defaultSeoTitleEn:250,defaultSeoTitleAr:250,defaultSeoDescriptionEn:500,defaultSeoDescriptionAr:500,heroVideoUrl:2048,heroMp4Url:2048,heroPosterImageUrl:2048});
  for(const key of ['agencyNameEn','agencyNameAr'])if(!String(m[key]??'').trim())e[key]=['required'];
  if(m['email'] && !/^[^@]+@[^@]+$/.test(m['email']))e['email']=['email'];
  for(const [i,link] of (m['socialLinks']??[]).entries()){if(!link.url?.trim())e['url'+i]=['required'];else if(!absoluteUrl(link.url))e['url'+i]=['url'];if(!integer(link.displayOrder))e['order'+i]=['invalid'];}
  for(const key of ['heroMp4Url','heroPosterImageUrl'])if(m[key]?.trim()) {const value=m[key].trim(),local=value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\');try{const url=new URL(local?'https://local.invalid'+value:value);if(url.protocol!=='https:'||url.username||url.password||(key==='heroMp4Url'&&!url.pathname.toLowerCase().endsWith('.mp4')))e[key]=['url'];}catch{e[key]=['url'];}}
  if(m['heroVideoUrl']?.trim()){try{const url=new URL(m['heroVideoUrl']);const host=url.hostname.toLowerCase(),parts=url.pathname.split('/').filter(Boolean);let id:string|null=null;if(host==='youtu.be'||host==='www.youtu.be')id=parts[0]??null;else if(['youtube.com','www.youtube.com','m.youtube.com'].includes(host)){if(url.pathname.toLowerCase()==='/watch')id=url.searchParams.get('v');else if(['embed','shorts'].includes((parts[0]??'').toLowerCase()))id=parts[1]??null;}if(!['http:','https:'].includes(url.protocol)||!id||! /^[A-Za-z0-9_-]{11}$/.test(id))e['heroVideoUrl']=['url'];}catch{e['heroVideoUrl']=['url'];}}
  return e;
}
export function accountFeedback(m:Record<string,any>,confirmation:string):Errors {
  const e:Errors={};if(!m['displayName']?.trim())e['displayName']=['required'];
  if(!m['email']?.trim())e['email']=['required'];else if(Validators.email(new FormControl(m['email'])))e['email']=['email'];
  if(!m['password'])e['password']=['required'];else if(!/[A-Z]/.test(m['password'])||!/[a-z]/.test(m['password'])||!/[0-9]/.test(m['password'])||!/[^a-zA-Z0-9]/.test(m['password']))e['password']=['password'];
  if(!confirmation)e['confirmPassword']=['required'];else if(confirmation!==m['password'])e['confirmPassword']=['mismatch'];return e;
}
