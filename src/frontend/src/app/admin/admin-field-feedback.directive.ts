import { AfterViewChecked, Directive, ElementRef, HostListener, Input, OnDestroy, inject } from '@angular/core';
import { NgForm } from '@angular/forms';
import { AdminLocaleService } from '../core/admin-locale.service';

type Errors=Record<string,string[]>;
type Field=HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement;
let fieldSequence=0;
const editors=new WeakMap<HTMLFormElement,AdminFieldFeedbackDirective>();
const names:Record<string,[string,string]>={titleEn:['English title','العنوان الإنجليزي'],titleAr:['Arabic title','العنوان العربي'],slugEn:['English slug','الرابط المختصر الإنجليزي'],slugAr:['Arabic slug','الرابط المختصر العربي'],nameEn:['English name','الاسم الإنجليزي'],nameAr:['Arabic name','الاسم العربي'],authorName:['Author name','اسم الكاتب'],categoryId:['Category','التصنيف'],youTubeUrl:['YouTube video link','رابط فيديو يوتيوب'],contentType:['Content type','نوع المحتوى'],thumbnailUrl:['Thumbnail URL','رابط الصورة المصغرة'],episodeNumber:['Episode number','رقم الحلقة'],seasonNumber:['Season number','رقم الموسم'],heroMp4Url:['Hero MP4 URL','رابط فيديو الواجهة'],heroPosterImageUrl:['Hero poster URL','رابط الصورة البديلة'],email:['Email','البريد الإلكتروني'],password:['Password','كلمة المرور'],confirmPassword:['Password confirmation','تأكيد كلمة المرور'],displayName:['Name','الاسم'],publishedAt:['Publication date','تاريخ النشر'],projectDate:['Project date','تاريخ المشروع']};
function label(field:Field,ar:boolean):string {
  const indexed=field.name.match(/^(image|altEn|altAr|tagEn|tagAr|platform|url|order)(\d+)$/);
  if(indexed){const labels:Record<string,[string,string]>={image:['Gallery image URL','رابط صورة المعرض'],altEn:['English image alt text','النص البديل الإنجليزي للصورة'],altAr:['Arabic image alt text','النص البديل العربي للصورة'],tagEn:['English tag','الوسم الإنجليزي'],tagAr:['Arabic tag','الوسم العربي'],platform:['Social platform','منصة التواصل'],url:['Social link URL','رابط التواصل'],order:['Display order','ترتيب العرض']};return labels[indexed[1]][ar?1:0]+' '+(Number(indexed[2])+1);}
  if(names[field.name]) return names[field.name][ar?1:0];
  const parent=field.closest('label')?.cloneNode(true) as HTMLElement|undefined;
  parent?.querySelectorAll('input,select,textarea,[data-field-error],[data-required-marker]').forEach(n=>n.remove());
  return parent?.textContent?.trim() || field.getAttribute('aria-label') || field.getAttribute('placeholder') || field.name;
}
function message(field:Field,code:string,ar:boolean):string {
  const name=label(field,ar);
  if(code==='required')return ar?`حقل ${name} مطلوب.`:`${name} is required.`;
  if(code==='length'||code==='maxlength')return ar?`القيمة في حقل ${name} تتجاوز الحد المسموح للحروف.`:`The value in ${name} exceeds the character limit.`;
  if(code==='minlength')return ar?`أدخل قيمة أطول في حقل ${name}.`:`Enter a longer value for ${name}.`;
  if(code==='conflict')return ar?`القيمة في حقل ${name} مستخدمة بالفعل.`:`${name} is already in use.`;
  if(code==='email')return ar?'أدخل بريدًا إلكترونيًا صحيحًا.':'Enter a valid email address.';
  if(field.name==='episodeNumber'||field.name==='seasonNumber')return ar?`أدخل عددًا صحيحًا أكبر من صفر في حقل ${name}.`:`${name} must be a whole number greater than zero.`;
  if(code==='url')return ar?`أدخل رابطًا صحيحًا في حقل ${name}.`:`Enter a valid URL for ${name}.`;
  if(code==='reserved')return ar?'هذا البريد محجوز. استخدم بريدًا آخر.':'This email is reserved. Use another email address.';
  if(code==='mismatch')return ar?'تأكيد كلمة المرور غير مطابق.':'Password confirmation must match the password.';
  if(code==='password')return ar?'استخدم حرفًا إنجليزيًا كبيرًا وصغيرًا ورقمًا ورمزًا في كلمة المرور.':'Password must include uppercase, lowercase, a number and a symbol.';
  return ar?`أدخل قيمة صحيحة في حقل ${name}.`:`Enter a valid value for ${name}.`;
}
export function publishFieldErrors(root:HTMLElement,errors:Errors):boolean {
  const form=root.querySelector('form'); const editor=form ? editors.get(form):undefined;
  if(!editor)return false;editor.show(errors);return true;
}

/** Presentation only: uses the editor's existing rules and Angular control errors. */
@Directive({selector:'form[adminFieldFeedback]',standalone:true})
export class AdminFieldFeedbackDirective implements AfterViewChecked,OnDestroy {
  @Input('adminFieldFeedback') validate:()=>Errors=()=>({});
  private readonly element:HTMLFormElement=inject(ElementRef).nativeElement;
  private readonly form=inject(NgForm,{self:true});
  private readonly locale=inject(AdminLocaleService);
  private touched=new Set<string>();private wasSubmitted=false;private attempted=false;private pending=false;private destroyed=false;
  private extra:Errors={};private snapshots=new Map<string,string>();
  private styles=new Map<Field,string>();private notes=new Map<Field,HTMLElement>();private wrappers=new Map<Field,HTMLDivElement>();private composites=new Map<Element,HTMLDivElement>();private compositeMargins=new Map<Element,string>();
  constructor(){this.element.noValidate=true;editors.set(this.element,this);}
  @HostListener('focusout',['$event.target']) blur(value:EventTarget|null){const target=value as Field|null;if(target?.name){this.touched.add(target.name);this.refresh();}}
  @HostListener('input',['$event.target']) input(value:EventTarget|null){const target=value as Field|null;if(target?.name){delete this.extra[target.name];this.schedule();}}
  @HostListener('change',['$event.target']) change(target:EventTarget|null){this.input(target);}
  @HostListener('submit') submit(){this.attempted=true;this.schedule();}
  ngAfterViewChecked(){this.refresh();}
  private schedule(){if(this.pending||this.destroyed)return;this.pending=true;queueMicrotask(()=>{this.pending=false;if(!this.destroyed)this.refresh();});}
  show(errors:Errors){this.attempted=Object.keys(errors).length>0;this.extra=this.normalize(errors);this.snapshots.clear();this.fields().forEach(f=>this.snapshots.set(f.name,f.value));this.refresh();}
  private fields():Field[]{return Array.from(this.element.querySelectorAll<Field>('input[name],select[name],textarea[name]'));}
  private normalize(errors:Errors):Errors {
    const result:Errors={};const aliases:Record<string,string>={agencynameen:'nameEn',agencynamear:'nameAr',agencydescriptionen:'descriptionEn',agencydescriptionar:'descriptionAr',logourl:'logo',faviconurl:'favicon',shortdescriptionen:'shortEn',shortdescriptionar:'shortAr',imageurl:'image',displayorder:'order'};
    for(const [key,value] of Object.entries(errors)){const social=key.match(/SocialLinks\[(\d+)\]\.(Url|Platform|DisplayOrder|IsVisible)$/i);if(social){result[({url:'url',platform:'platform',displayorder:'order',isvisible:'visible'}[social[2].toLowerCase()]!)+social[1]]=value;continue;}const normalized=key.split('.').pop()!.toLowerCase();const name=this.fields().find(f=>f.name.toLowerCase()===normalized)?.name ?? aliases[normalized] ?? key;result[name]=value;}return result;
  }
  private refresh(){
    if(this.form.submitted)this.wasSubmitted=true;else if(this.wasSubmitted){this.wasSubmitted=false;this.attempted=false;this.touched.clear();this.extra={};this.snapshots.clear();}
    const calculated=this.normalize(this.validate());
    for(const field of this.styles.keys())if(!this.element.contains(field)){this.styles.delete(field);this.notes.get(field)?.remove();this.notes.delete(field);this.wrappers.delete(field);}
    for(const field of this.fields()){
      if(!this.styles.has(field))this.styles.set(field,field.style.borderColor);
      if(!field.labels?.length && !this.wrappers.has(field)){
        const wrapper=document.createElement('div');wrapper.style.minWidth='0';field.before(wrapper);wrapper.append(field);this.wrappers.set(field,wrapper);
        const caption=document.createElement('label');field.id ||= 'admin-field-'+(++fieldSequence);caption.htmlFor=field.id;caption.textContent=label(field,this.locale.locale()==='ar');caption.style.cssText='display:block;font-size:.75rem;color:#a0a0a0';wrapper.prepend(caption);
      }
      const generated=this.wrappers.get(field)?.querySelector('label');if(generated?.firstChild)generated.firstChild.textContent=label(field,this.locale.locale()==='ar');
      const caption=field.labels?.[0] ?? this.wrappers.get(field)?.querySelector('label');
      const marker=caption?.querySelector('[data-required-marker]');
      if(field.required&&!marker&&caption){const star=document.createElement('span');star.dataset['requiredMarker']='';star.setAttribute('aria-hidden','true');star.textContent=' *';star.style.color='#d4a077';if(caption.contains(field))caption.insertBefore(star,field);else caption.append(star);}
      else if(!field.required)marker?.remove();
      if(this.snapshots.has(field.name)&&this.snapshots.get(field.name)!==field.value)delete this.extra[field.name];
      const control=this.form.controls[field.name];
      const angular=control?.errors ? Object.keys(control.errors)[0]:undefined;
      const code=calculated[field.name]?.[0] ?? this.extra[field.name]?.[0] ?? angular;
      const visible=!!code&&!field.matches(':disabled')&&(this.attempted||this.touched.has(field.name)||!!control?.touched);
      const id='editor-error-'+field.name;
      let note=this.notes.get(field);
      const descriptions=(field.getAttribute('aria-describedby')??'').split(/\s+/).filter(x=>x&&!x.startsWith('editor-error-'));
      if(visible){
        if(!note){note=document.createElement('span');note.dataset['fieldError']=field.name;note.dataset['editorError']='';note.id=id;note.style.cssText='display:block;margin-top:.35rem;font-size:.75rem;line-height:1.5;color:#f0aaaa;overflow-wrap:anywhere;max-width:100%';const composite=field.closest('.password-field');if(composite){if(!this.composites.has(composite)){const wrapper=document.createElement('div');wrapper.style.minWidth='0';wrapper.style.marginBlockEnd=getComputedStyle(composite).marginBlockEnd;this.compositeMargins.set(composite,(composite as HTMLElement).style.marginBlockEnd);(composite as HTMLElement).style.marginBlockEnd='0';composite.before(wrapper);wrapper.append(composite);this.composites.set(composite,wrapper);}composite.after(note);}else field.after(note);this.notes.set(field,note);}
        note.dataset['fieldError']=field.name;note.id=id;note.textContent=message(field,code,this.locale.locale()==='ar');field.style.borderColor='#ce7777';field.setAttribute('aria-invalid','true');descriptions.push(id);
      }else{note?.remove();this.notes.delete(field);field.style.borderColor=this.styles.get(field)!;field.removeAttribute('aria-invalid');}
      if(descriptions.length)field.setAttribute('aria-describedby',descriptions.join(' '));else field.removeAttribute('aria-describedby');
    }
    for(const group of Array.from(this.element.querySelectorAll<HTMLElement>('[data-validation-group]'))){
      const key=group.dataset['validationGroup']!;const code=calculated[key]?.[0]??this.extra[key]?.[0];let note=group.querySelector<HTMLElement>('[data-group-error]');
      if(code&&this.attempted){if(!note){note=document.createElement('p');note.dataset['groupError']='';note.id='editor-error-'+key;note.style.cssText='font-size:.75rem;color:#f0aaaa;margin-top:.35rem';group.append(note);}note.textContent=this.locale.locale()==='ar'?'لا يمكن إضافة أكثر من 20 وسمًا.':'Use no more than 20 tags.';group.setAttribute('aria-invalid','true');group.setAttribute('aria-describedby',note.id);}
      else{note?.remove();group.removeAttribute('aria-invalid');group.removeAttribute('aria-describedby');}
    }
  }
  ngOnDestroy(){this.destroyed=true;editors.delete(this.element);this.styles.forEach((color,field)=>field.style.borderColor=color);this.element.querySelectorAll('[data-field-error],[data-group-error],[data-required-marker]').forEach(n=>n.remove());this.wrappers.forEach((wrapper,field)=>{wrapper.before(field);wrapper.remove();});this.composites.forEach((wrapper,group)=>{(group as HTMLElement).style.marginBlockEnd=this.compositeMargins.get(group)??'';wrapper.before(group);wrapper.remove();});}
}
