import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { AdminTextPipe } from '../core/admin-text.pipe';
import { AdminLocaleService } from '../core/admin-locale.service';
interface Media { id:string; titleEn:string; titleAr:string; descriptionEn:string|null; descriptionAr:string|null; contentType:string; thumbnailUrl:string|null; publishedAt:string|null; isPublished:boolean; isFeatured:boolean; }
@Component({ standalone:true, imports:[RouterLink,AdminTextPipe], templateUrl:'./admin-home.page.html' })
export class AdminHomePage implements OnInit {
  private readonly http=inject(HttpClient); private readonly destroyRef=inject(DestroyRef); readonly locale=inject(AdminLocaleService);
  readonly loading=signal(true); readonly error=signal(false); readonly media=signal<Media[]|null>(null);
  private request?:Subscription;
  counts: (number|null)[]=[null,null,null,null];
  ngOnInit():void { this.load(); }
  title(item:Media):string { return (this.locale.locale()==='ar' ? item.titleAr : item.titleEn) || item.titleEn || item.titleAr; }
  complete(item:Media,language:'en'|'ar'):boolean { return !!(language==='en' ? item.titleEn.trim() && item.descriptionEn?.trim() : item.titleAr.trim() && item.descriptionAr?.trim()); }
  status(item:Media):string { return !item.isPublished ? 'Draft' : item.publishedAt && Date.parse(item.publishedAt)>Date.now() ? 'Scheduled' : 'Published'; }
  get published():number { return this.media()?.filter(item=>this.status(item)==='Published').length ?? 0; }
  get scheduled():number { return this.media()?.filter(item=>this.status(item)==='Scheduled').length ?? 0; }
  get drafts():number { return this.media()?.filter(item=>!item.isPublished).length ?? 0; }
  get states() { return [{label:'Published',value:this.published},{label:'Draft',value:this.drafts},{label:'Scheduled',value:this.scheduled}]; }
  percent(value:number):number { return this.media()?.length ? value/this.media()!.length*100 : 0; }
  get distribution() { const count=new Map<string,number>(); for(const item of this.media() ?? []) count.set(item.contentType,(count.get(item.contentType)??0)+1); return [...count].map(([name,count])=>({name,count})); }
  get recent():Media[] { return [...this.media()??[]].sort((a,b)=>(Date.parse(b.publishedAt??'')||0)-(Date.parse(a.publishedAt??'')||0)).slice(0,6); }
  get cards() { const all=this.media();return [
    {label:'Total media',path:'/admin/videos',value:all?.length??null},{label:'Published media',path:'/admin/videos',value:all ? this.published : null},
    {label:'Videos',path:'/admin/videos',value:all?.filter(x=>x.contentType!=='podcast').length??null},{label:'Podcasts',path:'/admin/podcasts',value:all?.filter(x=>x.contentType==='podcast').length??null},
    {label:'Categories',path:'/admin/categories',value:this.counts[0]},{label:'Services',path:'/admin/services',value:this.counts[1]},
    {label:'Projects',path:'/admin/portfolio',value:this.counts[2]},{label:'Insights',path:'/admin/articles',value:this.counts[3]} ]; }
  number(value:number):string { return new Intl.NumberFormat(this.locale.locale()).format(value); }
  date(value:string|null):string { return value ? new Intl.DateTimeFormat(this.locale.locale()==='ar'?'ar-EG':'en-US',{dateStyle:'medium'}).format(new Date(value)) : '—'; }
  load():void {
    this.request?.unsubscribe();this.loading.set(true);this.error.set(false);this.media.set(null);this.counts=[null,null,null,null];
    const read=<T>(path:string)=>this.http.get<T[]>(path).pipe(catchError(()=>{this.error.set(true);return of(null);}));
    this.request=forkJoin({media:read<Media>('/api/admin/videos'),categories:read<unknown>('/api/admin/categories'),services:read<unknown>('/api/admin/services'),projects:read<unknown>('/api/admin/portfolio'),articles:read<unknown>('/api/admin/articles')}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result=>{this.media.set(result.media);this.counts=[result.categories?.length??null,result.services?.length??null,result.projects?.length??null,result.articles?.length??null];this.loading.set(false);});
  }
}

