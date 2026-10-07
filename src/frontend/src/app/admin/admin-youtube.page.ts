import { CommonModule, registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminTextPipe } from '../core/admin-text.pipe';
import { AdminLocaleService } from '../core/admin-locale.service';

registerLocaleData(localeAr);

function readLastSync(): string | null {
 try { return localStorage.getItem('space-media.admin.youtube.lastSync'); }
 catch { return null; }
}

interface Category { id: string; nameEn: string; nameAr: string; }
@Component({standalone:true,imports:[CommonModule,FormsModule,AdminTextPipe],template:`
<section class="mx-auto max-w-4xl space-y-6"><header><p class="text-sm font-medium text-[#d4a077]">{{'Channel tools'|adminText}}</p><h1 class="mt-1 text-2xl font-bold">{{'YouTube sync'|adminText}}</h1><p class="mt-1 text-sm text-[#a0a0a0]">{{'Import public uploads and keep video metadata current.'|adminText}}</p></header>
<div class="grid gap-4 sm:grid-cols-2"><div class="rounded-2xl border border-white/10 p-5"><p class="text-sm text-[#a0a0a0]">{{'Last sync'|adminText}}</p><p class="mt-2 font-semibold">{{lastSync ? (lastSync | date:'medium':undefined:locale.locale()) : ('Never'|adminText)}}</p></div><div class="rounded-2xl border border-white/10 p-5"><p class="text-sm text-[#a0a0a0]">{{'YouTube connection'|adminText}}</p><p class="mt-2 font-semibold" [class.text-emerald-200]="!configurationError">{{configurationError ? ('Configuration required'|adminText) : ('Connection checked when syncing'|adminText)}}</p></div></div>
<div class="rounded-2xl border border-white/10 p-5 sm:p-6"><label class="block max-w-lg text-sm font-medium">{{'Default category for new synchronized videos'|adminText}}<select [(ngModel)]="categoryId" class="mt-2 w-full rounded-xl border border-white/10 px-3 py-2.5"><option value="">{{'Choose a category'|adminText}}</option><option *ngFor="let c of categories" [value]="c.id">{{c.nameEn}} / {{c.nameAr}}</option></select></label><p class="mt-2 text-xs text-[#a0a0a0]">{{'New uploads are saved as drafts. Existing edited copy and publishing settings are preserved.'|adminText}}</p><button (click)="sync()" [disabled]="busy || !categoryId" class="mt-5 rounded-xl bg-[#d4a077] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{{(busy?'Syncing…':'Sync YouTube uploads')|adminText}}</button></div>
<div *ngIf="result" class="grid gap-3 sm:grid-cols-3"><div class="rounded-xl bg-emerald-400/10 p-4"><p class="text-xs text-emerald-200">{{'New videos found'|adminText}}</p><p class="mt-1 text-2xl font-bold text-emerald-800">{{result.added}}</p></div><div class="rounded-xl bg-[#d4a077]/10 p-4"><p class="text-xs text-[#d4a077]">{{'Updated videos'|adminText}}</p><p class="mt-1 text-2xl font-bold text-indigo-800">{{result.updated}}</p></div><div class="rounded-xl bg-[#1b1b1b] p-4"><p class="text-xs text-[#b4b4b4]">{{'Skipped'|adminText}}</p><p class="mt-1 text-2xl font-bold">{{result.skipped}}</p></div></div><p *ngIf="error" role="alert" class="rounded-xl border border-rose-200 bg-rose-400/10 p-4 text-sm text-rose-200">{{error|adminText}}</p></section>`})
export class AdminYouTubePage implements OnInit {
 private readonly http=inject(HttpClient); private readonly cdr=inject(ChangeDetectorRef); readonly locale=inject(AdminLocaleService); categories:Category[]=[];categoryId='';busy=false;error='';configurationError=false;result:{added:number;updated:number;skipped:number}|null=null;lastSync=readLastSync();
 ngOnInit():void{this.http.get<Category[]>('/api/admin/categories').subscribe({next:x=>{this.categories=x;this.categoryId=x[0]?.id??'';this.cdr.markForCheck()},error:()=>{this.error='Could not load categories. Create one before synchronizing.';this.cdr.markForCheck()}});}
 sync():void{if(!this.categoryId)return;this.busy=true;this.error='';this.configurationError=false;this.http.post<{added:number;updated:number;skipped:number}>('/api/admin/youtube/sync',{categoryId:this.categoryId}).subscribe({next:r=>{this.result=r;this.busy=false;this.lastSync=new Date().toISOString();try{localStorage.setItem('space-media.admin.youtube.lastSync',this.lastSync);}catch{/* Sync completed even when browser storage is unavailable. */}},error:e=>{this.busy=false;this.configurationError=e.status===503;this.error=e.status===503?'Configure the YouTube API key and channel ID in the API environment.':'YouTube sync failed. Check the channel configuration and try again.';}});}
}
