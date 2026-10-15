import { ChangeDetectorRef, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { AdminLocaleService } from '../core/admin-locale.service';

export const validCmsVersion=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)&&!/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
export const versionedDeleteUrl=(url:string,version?:string)=>version ? `${url}?expectedVersion=${encodeURIComponent(version)}` : url;
export function createCmsConcurrency(){
 const http=inject(HttpClient),locale=inject(AdminLocaleService),cdr=inject(ChangeDetectorRef),destroy=inject(DestroyRef);
 const blocked=signal(false),loading=signal(false),latest=signal<any>(null),message=signal(''),baseline=signal<any>(null);
 let getter:()=>any=()=>({}),url='',id:string|undefined,expected:string|undefined;
 let onResolved:()=>void=()=>{};
 const unload=(event:BeforeUnloadEvent)=>{if(blocked()){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',unload);destroy.onDestroy(()=>window.removeEventListener('beforeunload',unload));
 const ar=()=>locale.locale()==='ar';
 const text=(en:string,arabic:string)=>ar()?arabic:en;
 const state={blocked,loading,latest,message,baseline,
  get ar(){return ar();},get draft(){return getter();},
  open(read:()=>any,endpoint:string,recordId?:string,version?:string,resolved:()=>void=()=>{}){getter=read;url=endpoint;id=recordId;expected=version;onResolved=resolved;baseline.set(structuredClone(read()));latest.set(null);message.set('');blocked.set(!!recordId&&!validCmsVersion(version));if(blocked())message.set(text('Version information is unavailable. Reload before editing.','بيانات النسخة غير متاحة. أعد التحميل قبل التعديل.'));},
  canLeave(){return !blocked()||window.confirm(text('Leave this conflicted draft? Copy any changes you want to keep first.','هل تريد مغادرة هذه التعديلات؟ انسخ ما تريد الاحتفاظ به أولًا.'));},
  payload(body:any){const {version,expectedVersion,...fields}=body;return {...fields,...(id?{expectedVersion:expected}:{}),...(url==='/api/admin/settings'&&!id?{createIfAbsent:true}:{})};},
  handle(error:any){if(!['cms_concurrency_conflict','cms_version_required','cms_record_missing'].includes(error?.error?.code))return false;blocked.set(true);latest.set(null);message.set(text('This record changed or is unavailable. Your draft is preserved. Review the latest version before saving again.','تم تغيير هذا السجل أو أصبح غير متاح. احتفظنا بتعديلاتك غير المحفوظة. راجع النسخة الحالية قبل الحفظ مجددًا.'));cdr.markForCheck();return true;},
  observe(endpoint:string,recordId:string,resolved:()=>void){url=endpoint;id=recordId;onResolved=resolved;state.conflict();},
  conflict(){state.handle({error:{code:'cms_concurrency_conflict'}});},
  refresh(){if(loading()||!url)return;loading.set(true);http.get<any>(url).pipe(timeout(30000),takeUntilDestroyed(destroy),finalize(()=>{loading.set(false);cdr.markForCheck();})).subscribe({next:value=>{const row=Array.isArray(value)?value.find(x=>x.id===id):value;if(!row||!validCmsVersion(row.version)){message.set(text('The latest record could not be verified. Your draft is preserved.','تعذر التحقق من النسخة الحالية. تعديلاتك محفوظة.'));return;}const copy=structuredClone(row);if('youTubeUrl' in getter()){copy.youTubeUrl=copy.youTubeVideoId?`https://www.youtube.com/watch?v=${copy.youTubeVideoId}`:'';for(const key of ['descriptionEn','descriptionAr','thumbnailUrl','guestNameEn','guestNameAr','seoTitleEn','seoTitleAr','seoDescriptionEn','seoDescriptionAr'])copy[key]=copy[key]??'';}if(copy.publishedAt&&typeof getter().publishedAt==='string'){const d=new Date(copy.publishedAt);copy.publishedAt=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}if(Object.keys(getter()).some(key=>!['version','expectedVersion','id','exists'].includes(key)&&!(key in copy))){message.set(text('The latest response is incomplete. Your draft is preserved.','البيانات الحالية غير مكتملة. احتفظنا بتعديلاتك.'));return;}latest.set(copy);},error:()=>{message.set(text('Could not read the latest version. No changes were made.','تعذر قراءة النسخة الحالية. لم يتم إجراء أي تغييرات.'));}});},
  get comparison(){const keys=Object.keys(baseline()??{}).filter(k=>!['version','expectedVersion','id','exists'].includes(k));return keys.map(key=>({key,before:JSON.stringify(baseline()?.[key]??null),draft:JSON.stringify(getter()[key]??null),latest:JSON.stringify(latest()?.[key]??null)}));},
  useLatest(){if(!latest()||!window.confirm(text('Replace your draft with the latest version?','هل تريد استبدال تعديلاتك بالنسخة الحالية؟')))return;const target=getter(),row=latest();for(const key of Object.keys(target))if(key in row)target[key]=structuredClone(row[key]);expected=row.version;baseline.set(structuredClone(target));blocked.set(false);latest.set(null);message.set('');onResolved();cdr.markForCheck();}
 };return state;
}
export type CmsConcurrencyState=ReturnType<typeof createCmsConcurrency>;
