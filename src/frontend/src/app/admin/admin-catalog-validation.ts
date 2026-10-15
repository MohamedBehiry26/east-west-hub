import { NgForm } from '@angular/forms';

export type FieldErrors = Record<string, string[]>;
function base(model: object, limits: Record<string,number>, required: string[]): FieldErrors {
  const values=model as Record<string,unknown>, errors:FieldErrors={};
  for(const key of required) if(!String(values[key] ?? '').trim()) errors[key]=['required'];
  for(const [key,limit] of Object.entries(limits)) if(typeof values[key]==='string' && (values[key] as string).length>limit) errors[key]=['length'];
  if(!Number.isInteger(values['displayOrder']) || Number(values['displayOrder']) < -2147483648 || Number(values['displayOrder']) > 2147483647) errors['displayOrder']=['invalid'];
  return errors;
}
export function validateProject(model: object, form?: NgForm): FieldErrors {
  const m=model as Record<string,any>;
  const errors=base(model,{titleEn:200,titleAr:200,slugEn:180,slugAr:180,client:160,categoryEn:120,categoryAr:120,coverImageUrl:2048},['titleEn','titleAr','slugEn','slugAr']);
  if(m['projectDate'] && !/^\d{4}-\d{2}-\d{2}$/.test(m['projectDate'])) errors['projectDate']=['invalid'];
  else if(m['projectDate'] && (!Number.isFinite(Date.parse(m['projectDate'])) || new Date(m['projectDate']).toISOString().slice(0,10)!==m['projectDate'])) errors['projectDate']=['invalid'];
  (m['images'] ?? []).forEach((image:any,i:number)=>{for(const [key,name,limit] of [['imageUrl','image',2048],['altTextEn','altEn',250],['altTextAr','altAr',250]] as const) if((image[key]?.length ?? 0)>limit) errors[name+i]=['length']; if(!Number.isInteger(image.displayOrder) || image.displayOrder < -2147483648 || image.displayOrder > 2147483647) errors['order'+i]=['invalid'];});
  for(const [key,control] of Object.entries(form?.controls ?? {})) if(control.invalid) errors[key] ??= ['invalid'];
  return errors;
}
export function validateMedia(model: object, editing: boolean, validYouTube: boolean, form?: NgForm): FieldErrors {
  const m=model as Record<string,any>;
  const errors=base(model,{youTubeUrl:2048,titleEn:250,titleAr:250,slugEn:180,slugAr:180,thumbnailUrl:2048,guestNameEn:160,guestNameAr:160,seoTitleEn:250,seoTitleAr:250,seoDescriptionEn:500,seoDescriptionAr:500},['titleEn','titleAr','slugEn','slugAr','categoryId']);
  if((!editing || String(m['youTubeUrl'] ?? '').trim()) && !validYouTube) errors['youTubeUrl']=['invalid'];
  if(!['video','podcast','program','interview','campaign','documentary','originalContent','event','brandedContent','other'].includes(m['contentType'])) errors['contentType']=['invalid'];
  for(const key of ['episodeNumber','seasonNumber']) if(m[key]!=null && (!Number.isInteger(m[key]) || m[key]<1 || m[key]>2147483647)) errors[key]=['invalid'];
  // Match the existing backend UrlAttribute protocols; do not add an HTTPS-only rule.
  if(m['thumbnailUrl']?.trim()) { try { const url=new URL(m['thumbnailUrl']); if(!['http:','https:','ftp:'].includes(url.protocol) || !url.hostname) errors['thumbnailUrl']=['url']; } catch { errors['thumbnailUrl']=['url']; } }
  if((m['tags'] ?? []).length>20) errors['tags']=['length'];
  (m['tags'] ?? []).forEach((tag:any,i:number)=>{for(const [key,name] of [['nameEn','tagEn'],['nameAr','tagAr']]) {if(!String(tag[key] ?? '').trim()) errors[name+i]=['required'];else if(tag[key].length>100) errors[name+i]=['length'];}});
  for(const [key,control] of Object.entries(form?.controls ?? {})) if(control.invalid) errors[key] ??= ['invalid'];
  return errors;
}
export function catalogFieldErrors(errors: FieldErrors): FieldErrors {
  const result:FieldErrors={};
  for(const [key,value] of Object.entries(errors)) {
    const image=key.match(/Images\[(\d+)\]\.(ImageUrl|AltTextEn|AltTextAr|DisplayOrder)$/i);
    const tag=key.match(/Tags\[(\d+)\]\.(NameEn|NameAr)$/i);
    result[image ? ({imageurl:'image',alttexten:'altEn',alttextar:'altAr',displayorder:'order'}[image[2].toLowerCase()]!+image[1]) : tag ? (tag[2].toLowerCase()==='nameen'?'tagEn':'tagAr')+tag[1] : key]=value;
  }
  return result;
}
