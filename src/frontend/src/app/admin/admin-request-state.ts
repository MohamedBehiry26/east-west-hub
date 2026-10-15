import {validCmsVersion} from './admin-concurrency-state';
import { ChangeDetectorRef, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, forkJoin, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminLocaleService } from '../core/admin-locale.service';

export function isAmbiguousFailure(error: {status?:number}): boolean {return !error.status || error.status<400 || error.status===408 || error.status>=500;}
type DeleteCheck={review?:(record:any)=>void;url:string;gone:(rows:any[])=>boolean;done:()=>void};
type SaveCheck={entityId?:string;expectedVersion?:string;kind?:'project'|'media';url:string;find:(rows:any[])=>any;observed:(record:any)=>void};
function validSavedRecord(record:any,kind?:'project'|'media'):boolean {
  if(!record||typeof record.id!=='string')return false;
  if(!kind)return true;
  if(!['titleEn','titleAr','slugEn','slugAr'].every(key=>typeof record[key]==='string'))return false;
  if(kind==='project')return Array.isArray(record.images)&&record.images.every((image:any)=>image&&typeof image.imageUrl==='string')&&Array.isArray(record.serviceIds);
  return Array.isArray(record.tags)&&record.tags.every((tag:any)=>tag&&typeof tag.nameEn==='string'&&typeof tag.nameAr==='string');
}
export function createAdminRequestState(){return new AdminRequestState(inject(HttpClient),inject(ChangeDetectorRef),inject(AdminLocaleService),inject(DestroyRef));}
export class AdminRequestState {
  readonly pending=signal(new Set<string>());readonly uncertainDeletes=signal(new Map<string,DeleteCheck>());
  readonly uncertainSave=signal<SaveCheck|null>(null);readonly savePending=signal(false);readonly checking=signal(false);readonly status=signal('');
  private completed=new Set<string>();
  private staleDeletes=new Set<string>();
  constructor(private http:HttpClient,private cdr:ChangeDetectorRef,private locale:AdminLocaleService,private destroy:DestroyRef){}
  deleteBlocked(id:string){return this.pending().has(id)||this.uncertainDeletes().has(id)||this.completed.has(id);}
  clearUnknownSave(){this.uncertainSave.set(null);this.status.set('');}
  clearNotice(){if(!this.unresolved&&!this.pending().size&&!this.savePending())this.status.set('');}
  confirmed(id:string){return this.completed.has(id);}
  saveBlocked(){return this.savePending()||!!this.uncertainSave();}
  keep<T extends {id:string}>(rows:T[]):T[]{return rows.filter(row=>!this.completed.has(row.id));}
  get unresolved(){return this.uncertainDeletes().size>0||!!this.uncertainSave();}
  get message(){const ar=this.locale.locale()==='ar';const key=this.unresolved && !['conflict','checking','checkFailed','notConfirmed'].includes(this.status())?'uncertain':this.status();return ({
    conflict:ar?'تم تغيير السجل. لن نكرر الحذف تلقائيًا. راجع البيانات الحالية أولًا.':'The record changed. Delete will not be repeated automatically. Review current records first.',
    conflictReviewed:ar?'تم تحميل السجل الحالي للمراجعة. لم نكرر الحذف؛ أي طلب جديد يتطلب تأكيدًا جديدًا.':'The current record was loaded for review. Delete was not retried; a new request needs fresh confirmation.',
    pending:ar?'جارٍ تنفيذ الطلب…':'Processing the request…',
    uncertain:ar?'نتيجة الطلب غير مؤكدة؛ قد يكون التغيير تم بالفعل. لا تكرر الإرسال. تحقق من البيانات الحالية أولًا.':'The result is uncertain; the change may already have completed. Do not submit it again. Check current records first.',
    checking:ar?'جارٍ التحقق من البيانات الحالية دون إجراء أي تغييرات…':'Checking current records without making changes…',
    checkFailed:ar?'تعذر التحقق. ما زالت النتيجة غير مؤكدة. حاول التحقق مجددًا لاحقًا.':'The status check failed. The result remains uncertain. Check again later.',
    notConfirmed:ar?'البيانات الحالية لا تؤكد نتيجة الطلب. يظل الإرسال محظورًا؛ تحقق مجددًا لاحقًا.':'Current records do not confirm the outcome. Submission remains blocked; check again later.',
    removed:ar?'تم تأكيد إزالة السجل أو تعطيله.':'Removal or deactivation is confirmed.',
    rejected:ar?'رفض الخادم طلب الحذف. راجع الصلاحيات أو المحتوى المرتبط قبل المحاولة مجددًا.':'The server rejected the delete request. Review permissions or related content before trying again.',
    observed:ar?'تم العثور على سجل يطابق القيم المرسلة. راجع البيانات قبل متابعة التعديل.':'A record matching the submitted values was found. Review it before continuing.',
  } as Record<string,string>)[key]??'';}
  get retryLabel(){return this.locale.locale()==='ar'?'التحقق من البيانات الحالية':'Check current records';}
  delete(id:string,url:string,check:DeleteCheck,confirm:()=>boolean,end:()=>void=()=>{}):boolean {
    if(this.deleteBlocked(id)||!confirm())return false;
    this.pending.update(set=>new Set(set).add(id));this.status.set('pending');
    this.http.delete(url).pipe(timeout(30_000),takeUntilDestroyed(this.destroy),finalize(()=>{this.pending.update(set=>{const next=new Set(set);next.delete(id);return next;});end();this.cdr.markForCheck();})).subscribe({
      next:()=>this.finishDelete(id,check),
      error:error=>{if(error?.error?.code==='cms_concurrency_conflict'){this.staleDeletes.add(id);this.uncertainDeletes.update(map=>new Map(map).set(id,check));this.status.set('conflict');}else if(isAmbiguousFailure(error)){this.uncertainDeletes.update(map=>new Map(map).set(id,check));this.status.set('uncertain');}else this.status.set('rejected');this.cdr.markForCheck();}
    });return true;
  }
  private finishDelete(id:string,check:DeleteCheck){if(this.completed.has(id))return;this.completed.add(id);this.uncertainDeletes.update(map=>{const next=new Map(map);next.delete(id);return next;});check.done();this.status.set('removed');this.cdr.markForCheck();}
  save<T>(request:Observable<T>,check:SaveCheck,success:(record:T)=>void,rejected:(error:any)=>void,end:()=>void){
    if(this.saveBlocked())return;
    this.savePending.set(true);this.status.set('');
    request.pipe(timeout(30_000),takeUntilDestroyed(this.destroy),finalize(()=>{this.savePending.set(false);end();this.cdr.markForCheck();})).subscribe({next:record=>{if(!validSavedRecord(record,check.kind)){this.uncertainSave.set(check);this.status.set('uncertain');}else success(record);},error:error=>{if(isAmbiguousFailure(error)){this.uncertainSave.set(check);this.status.set('uncertain');}else rejected(error);this.cdr.markForCheck();}});
  }
  recheck(){
    if(this.checking()||!this.unresolved)return;
    this.checking.set(true);this.status.set('checking');
    const deletes=new Map(this.uncertainDeletes()),save=this.uncertainSave();const urls=[...new Set([...Array.from(deletes.values()).map(item=>item.url),...(save?[save.url]:[])])];
    forkJoin(urls.map(url=>this.http.get<any[]>(url,{headers:{'Cache-Control':'no-cache'}}).pipe(timeout(30_000)))).pipe(takeUntilDestroyed(this.destroy),finalize(()=>{this.checking.set(false);this.cdr.markForCheck();})).subscribe({next:responses=>{
      if(responses.some(rows=>!Array.isArray(rows)||rows.some(row=>!row||typeof row.id!=='string'))){this.status.set('checkFailed');return;}
      const rowsByUrl=new Map(urls.map((url,i)=>[url,responses[i]]));
      for(const [id,check] of deletes){const rows=rowsByUrl.get(check.url)!;if(check.gone(rows))this.finishDelete(id,check);else if(this.staleDeletes.has(id)&&check.review){const row=rows.find(item=>item.id===id);if(row&&validCmsVersion(row.version)){check.review(row);this.staleDeletes.delete(id);this.uncertainDeletes.update(map=>{const next=new Map(map);next.delete(id);return next;});this.status.set('conflictReviewed');}}}
      if(save&&this.uncertainSave()===save){const candidates=rowsByUrl.get(save.url)!.filter(row=>validSavedRecord(row,save.kind));const record=save.find(candidates)??(save.expectedVersion&&save.entityId?candidates.find(row=>row.id===save.entityId):undefined);if(record&&(!save.expectedVersion||(validCmsVersion(record.version)&&record.version!==save.expectedVersion))){save.observed(record);if(!save.expectedVersion)this.uncertainSave.set(null);this.status.set('observed');}}
      if(this.unresolved)this.status.set('notConfirmed');
    },error:()=>this.status.set('checkFailed')});
  }
}
// Match submitted semantics, ignoring generated child IDs and nullable empty strings.
export function matchesSubmitted(record:any,payload:any,kind:'project'|'media',youtubeId?:string|null):boolean {
  if(kind==='media' && (record.youTubeVideoId??null)!==(youtubeId??null))return false;
  const scalar=(value:any,key='')=>typeof value==='string'?(kind==='media'||['titleEn','titleAr','slugEn','slugAr','imageUrl'].includes(key)?value.trim()||null:value.trim()?value:null):value??null;
  const rows=(value:any[],fields:string[])=>value.map(item=>fields.map(key=>scalar(item[key],key))).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  for(const [key,value] of Object.entries(payload)){if(key==='expectedVersion'||key==='version')continue;
    if(key==='id'||key==='youTubeUrl')continue;
    if(key==='images'){const images=(value as any[]).filter(item=>item.imageUrl?.trim());if(JSON.stringify(rows(images,['imageUrl','altTextEn','altTextAr','displayOrder']))!==JSON.stringify(rows(record.images??[],['imageUrl','altTextEn','altTextAr','displayOrder'])))return false;}
    else if(key==='tags'){if(JSON.stringify(rows(value as any[],['nameEn','nameAr']))!==JSON.stringify(rows(record.tags??[],['nameEn','nameAr'])))return false;}
    else if(key==='serviceIds'){if(JSON.stringify([...new Set(value as string[])].sort())!==JSON.stringify([...(record.serviceIds??[])].sort()))return false;}
    else if(scalar(value,key)!==scalar(record[key],key))return false;
  }return true;
}
