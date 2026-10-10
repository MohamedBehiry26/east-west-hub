import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AdminTextPipe } from '../core/admin-text.pipe';
import { AdminLocaleService } from '../core/admin-locale.service';

interface ServiceItem {
  id: string; titleEn: string; titleAr: string; slugEn: string; slugAr: string;
  shortDescriptionEn: string | null; shortDescriptionAr: string | null; descriptionEn: string | null; descriptionAr: string | null;
  featuresEn: string | null; featuresAr: string | null; processEn: string | null; processAr: string | null;
  imageUrl: string | null; displayOrder: number; isPublished: boolean;
  seoTitleEn: string | null; seoTitleAr: string | null; seoDescriptionEn: string | null; seoDescriptionAr: string | null;
}

interface PortfolioImage { id?: string; imageUrl: string; altTextEn: string | null; altTextAr: string | null; displayOrder: number; }
interface PortfolioItem {
  id: string; titleEn: string; titleAr: string; slugEn: string; slugAr: string; client: string | null; categoryEn: string | null; categoryAr: string | null;
  descriptionEn: string | null; descriptionAr: string | null; challengeEn: string | null; challengeAr: string | null;
  approachEn: string | null; approachAr: string | null;
  solutionEn: string | null; solutionAr: string | null; resultsEn: string | null; resultsAr: string | null;
  coverImageUrl: string | null; projectDate: string | null; displayOrder: number; isFeatured: boolean; isPublished: boolean;
  seoTitleEn: string | null; seoTitleAr: string | null; seoDescriptionEn: string | null; seoDescriptionAr: string | null;
  images: PortfolioImage[];
  serviceIds: string[];
}
interface ServiceOption { id: string; titleEn: string; titleAr: string; }
interface ArticleItem {
  id: string; titleEn: string; titleAr: string; slugEn: string; slugAr: string;
  excerptEn: string | null; excerptAr: string | null; contentEn: string | null; contentAr: string | null;
  coverImageUrl: string | null; authorId: string; authorName: string; publishedAt: string | null; isPublished: boolean;
  seoTitleEn: string | null; seoTitleAr: string | null; seoDescriptionEn: string | null; seoDescriptionAr: string | null;
}

const fieldClass = 'mt-1 w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4a077]';

@Component({
  standalone: true, imports: [CommonModule, FormsModule, AdminTextPipe],
  template: `
    <section class="space-y-7">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div><p class="text-xs font-semibold uppercase tracking-[.22em] text-[#d4a077]">{{ 'Content studio' | adminText }}</p><h1 class="mt-2 text-3xl font-semibold">{{ 'Services' | adminText }}</h1><p class="mt-2 text-sm text-[#a0a0a0]">{{ 'Manage bilingual service pages and publishing settings.' | adminText }}</p></div>
        <button type="button" (click)="startNew()" class="rounded-xl bg-[#d4a077] px-4 py-2.5 text-sm font-semibold text-[#17120e]">{{ 'Add service' | adminText }}</button>
      </header>
      <p *ngIf="error" role="alert" class="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{{error | adminText}}</p>
      <form *ngIf="editing" (ngSubmit)="save()" #editorForm="ngForm" class="space-y-5 rounded-2xl border border-white/10 bg-[#141414]/[.03] p-5 sm:p-7">
        <div class="flex items-center justify-between"><h2 class="text-lg font-semibold">{{ (model.id ? 'Edit service' : 'New service') | adminText }}</h2><button type="button" (click)="editing=false" class="text-sm text-[#a0a0a0]">{{ 'Close' | adminText }}</button></div>
        <div class="cms-language-tabs"><button type="button" (click)="editingLanguage='en'" [attr.aria-pressed]="editingLanguage==='en'">English</button><button type="button" (click)="editingLanguage='ar'" [attr.aria-pressed]="editingLanguage==='ar'">العربية</button></div><p class="cms-field-hint">{{ 'Complete both language tabs before saving.' | adminText }}</p><div class="grid gap-5 md:grid-cols-2">
          <fieldset [hidden]="editingLanguage !== 'en'" lang="en" dir="ltr" class="space-y-3"><legend class="mb-2 text-sm font-semibold text-[#d4a077]">English</legend>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Title' | adminText }}<input class="${fieldClass}" required maxlength="200" [(ngModel)]="model.titleEn" name="titleEn"></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Slug' | adminText }}<input class="${fieldClass}" required maxlength="180" [(ngModel)]="model.slugEn" name="slugEn"></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Short description' | adminText }}<textarea class="${fieldClass}" rows="2" [(ngModel)]="model.shortDescriptionEn" name="shortEn"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Overview' | adminText }}<textarea class="${fieldClass}" rows="5" [(ngModel)]="model.descriptionEn" name="descriptionEn"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Capabilities' | adminText }}<textarea class="${fieldClass}" rows="3" [placeholder]="'One capability per line' | adminText" [(ngModel)]="model.featuresEn" name="featuresEn"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Process' | adminText }}<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.processEn" name="processEn"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'SEO title' | adminText }}<input class="${fieldClass}" [(ngModel)]="model.seoTitleEn" name="seoTitleEn"></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'SEO description' | adminText }}<textarea class="${fieldClass}" rows="2" [(ngModel)]="model.seoDescriptionEn" name="seoDescriptionEn"></textarea></label>
          </fieldset>
          <fieldset [hidden]="editingLanguage !== 'ar'" lang="ar" class="space-y-3" dir="rtl"><legend class="mb-2 text-sm font-semibold text-[#d4a077]">العربية</legend>
            <label class="block text-xs text-[#a0a0a0]">العنوان<input class="${fieldClass}" required maxlength="200" [(ngModel)]="model.titleAr" name="titleAr"></label>
            <label class="block text-xs text-[#a0a0a0]">الرابط المختصر<input class="${fieldClass}" required maxlength="180" [(ngModel)]="model.slugAr" name="slugAr"></label>
            <label class="block text-xs text-[#a0a0a0]">وصف مختصر<textarea class="${fieldClass}" rows="2" [(ngModel)]="model.shortDescriptionAr" name="shortAr"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">التفاصيل<textarea class="${fieldClass}" rows="5" [(ngModel)]="model.descriptionAr" name="descriptionAr"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">الخدمات والإمكانات<textarea class="${fieldClass}" rows="3" placeholder="إمكانات، كل واحدة في سطر" [(ngModel)]="model.featuresAr" name="featuresAr"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">آلية العمل<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.processAr" name="processAr"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">عنوان SEO<input class="${fieldClass}" [(ngModel)]="model.seoTitleAr" name="seoTitleAr"></label>
            <label class="block text-xs text-[#a0a0a0]">وصف SEO<textarea class="${fieldClass}" rows="2" [(ngModel)]="model.seoDescriptionAr" name="seoDescriptionAr"></textarea></label>
          </fieldset>
        </div>
        <div class="grid gap-4 sm:grid-cols-[1fr_130px_auto] sm:items-end">
          <label class="block text-xs text-[#a0a0a0]">{{ 'Hero image URL' | adminText }}<input class="${fieldClass}" maxlength="2048" [(ngModel)]="model.imageUrl" name="imageUrl" type="url"></label>
          <label class="block text-xs text-[#a0a0a0]">{{ 'Display order' | adminText }}<input class="${fieldClass}" [(ngModel)]="model.displayOrder" name="order" type="number"></label>
          <label class="flex items-center gap-2 pb-3 text-sm"><input [(ngModel)]="model.isPublished" name="published" type="checkbox"> {{ 'Published' | adminText }}</label>
        </div>
        <div class="flex justify-end gap-3"><button type="button" (click)="editing=false" class="rounded-xl border border-white/15 px-4 py-2 text-sm">{{ 'Cancel' | adminText }}</button><button [disabled]="saving || editorForm.invalid" class="rounded-xl bg-[#d4a077] px-5 py-2 text-sm font-semibold text-[#17120e]">{{ (saving ? 'Saving…' : 'Save service') | adminText }}</button></div>
      </form>
      <div class="flex flex-wrap gap-3"><label class="flex-1 min-w-40 text-xs text-[#a0a0a0]">{{ 'Search' | adminText }}<input [(ngModel)]="query" (ngModelChange)="page=0" class="${fieldClass}" type="search"></label><label class="text-xs text-[#a0a0a0]">{{ 'Status' | adminText }}<select [(ngModel)]="statusFilter" (ngModelChange)="page=0" class="${fieldClass}"><option value="all">{{ 'All statuses' | adminText }}</option><option value="published">{{ 'Published' | adminText }}</option><option value="draft">{{ 'Draft' | adminText }}</option></select></label></div><div class="flex items-center justify-between text-xs text-[#a0a0a0]"><span>{{filteredItems.length}} {{ 'results' | adminText }}</span><div class="flex items-center gap-4"><button [disabled]="page===0" (click)="page=page-1">{{ 'Previous' | adminText }}</button><span>{{page+1}} / {{totalPages}}</span><button [disabled]="page>=totalPages-1" (click)="page=page+1">{{ 'Next' | adminText }}</button></div></div><div class="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]/[.02]">
        <div *ngFor="let item of pageItems" class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 last:border-0">
          <div><h2 class="font-medium">{{item.titleEn}} <span class="text-[#a0a0a0]">/ {{item.titleAr}}</span></h2><p class="mt-1 text-xs text-[#a0a0a0]">/{{item.slugEn}} · {{ (item.isPublished ? 'Published' : 'Draft') | adminText }} · {{ 'Display order' | adminText }} {{item.displayOrder}}</p><p class="mt-1 text-xs" [class.text-emerald-200]="translationComplete(item)" [class.text-amber-200]="!translationComplete(item)">{{ (translationComplete(item) ? 'translation.complete' : 'translation.missing') | adminText }}</p></div>
          <div class="cms-row-actions"><button type="button" (click)="edit(item)" class="cms-action cms-action--edit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z M14 5l5 5" /></svg>{{ 'Edit' | adminText }}</button><button type="button" (click)="remove(item)" class="cms-action cms-action--delete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7" /></svg>{{ 'Delete' | adminText }}</button></div>
        </div><p *ngIf="!filteredItems.length" class="p-8 text-center text-sm text-[#a0a0a0]">{{ 'No services yet. Add the first service.' | adminText }}</p>
      </div>
    </section>`
})
export class AdminServicesPage implements OnInit {
  query = ''; statusFilter = 'all'; page = 0; readonly pageSize = 10;
  get filteredItems(): ServiceItem[] { const q = this.query.trim().toLocaleLowerCase(); return this.items.filter(item => (!q || [item.titleEn,item.titleAr,item.slugEn,item.slugAr].some(value => value.toLocaleLowerCase().includes(q))) && (this.statusFilter === 'all' || item.isPublished === (this.statusFilter === 'published'))); }
  get pageItems(): ServiceItem[] { return this.filteredItems.slice(this.page*this.pageSize,(this.page+1)*this.pageSize); }
  get totalPages(): number { return Math.max(1,Math.ceil(this.filteredItems.length/this.pageSize)); }

  editingLanguage: 'en' | 'ar' = 'en';
  private readonly http = inject(HttpClient); private readonly cdr = inject(ChangeDetectorRef);
  private readonly locale = inject(AdminLocaleService);
  items: ServiceItem[] = []; editing = false; saving = false; error = '';
  model: ServiceItem = this.empty();
  ngOnInit(): void { this.load(); }
  private empty(): ServiceItem { return { id: '', titleEn: '', titleAr: '', slugEn: '', slugAr: '', shortDescriptionEn: '', shortDescriptionAr: '', descriptionEn: '', descriptionAr: '', featuresEn: '', featuresAr: '', processEn: '', processAr: '', imageUrl: '', displayOrder: 0, isPublished: false, seoTitleEn: '', seoTitleAr: '', seoDescriptionEn: '', seoDescriptionAr: '' }; }
  translationComplete(item: ServiceItem): boolean { return !!(item.titleAr.trim() && item.slugAr.trim() && item.descriptionAr?.trim()); }
  load(): void { this.http.get<ServiceItem[]>('/api/admin/services').subscribe({ next: (items) => { this.items = items; this.cdr.markForCheck(); }, error: () => { this.error = 'Could not load services. Please sign in again and retry.'; this.cdr.markForCheck(); } }); }
  startNew(): void { this.model = this.empty(); this.error = ''; this.editing = true; }
  edit(item: ServiceItem): void { this.model = { ...item }; this.error = ''; this.editing = true; }
  save(): void {
    this.saving = true; this.error = '';
    const { id, ...payload } = this.model;
    const request = id ? this.http.put<ServiceItem>(`/api/admin/services/${id}`, payload) : this.http.post<ServiceItem>('/api/admin/services', payload);
    request.subscribe({ next: () => { this.saving = false; this.editing = false; this.load(); }, error: (e) => { this.saving = false; this.error = e.status === 409 ? 'That English or Arabic slug is already in use.' : 'Could not save the service. Check the fields and try again.'; } });
  }
  remove(item: ServiceItem): void { if (window.confirm(this.locale.text('confirm.delete').replace('{title}', item.titleEn))) this.http.delete(`/api/admin/services/${item.id}`).subscribe({ next: () => this.load(), error: () => this.error = 'Could not delete this service.' }); }
}

@Component({
  standalone: true, imports: [CommonModule, FormsModule, AdminTextPipe],
  template: `
    <section class="space-y-7">
      <header class="flex flex-wrap items-end justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[.22em] text-[#d4a077]">{{ 'Case studies' | adminText }}</p><h1 class="mt-2 text-3xl font-semibold">{{ 'Portfolio' | adminText }}</h1><p class="mt-2 text-sm text-[#a0a0a0]">{{ 'Build bilingual case studies and manage their image galleries.' | adminText }}</p></div><button type="button" (click)="startNew()" class="rounded-xl bg-[#d4a077] px-4 py-2.5 text-sm font-semibold text-[#17120e]">{{ 'Add project' | adminText }}</button></header>
      <p *ngIf="error" role="alert" class="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{{error | adminText}}</p>
      <form *ngIf="editing" (ngSubmit)="save()" #editorForm="ngForm" class="space-y-5 rounded-2xl border border-white/10 bg-[#141414]/[.03] p-5 sm:p-7">
        <div class="flex items-center justify-between"><h2 class="text-lg font-semibold">{{ (model.id ? 'Edit project' : 'New project') | adminText }}</h2><button type="button" (click)="editing=false" class="text-sm text-[#a0a0a0]">{{ 'Close' | adminText }}</button></div>
        <div class="cms-language-tabs"><button type="button" (click)="editingLanguage='en'" [attr.aria-pressed]="editingLanguage==='en'">English</button><button type="button" (click)="editingLanguage='ar'" [attr.aria-pressed]="editingLanguage==='ar'">العربية</button></div><p class="cms-field-hint">{{ 'Complete both language tabs before saving.' | adminText }}</p><div class="grid gap-5 md:grid-cols-2">
          <fieldset [hidden]="editingLanguage !== 'en'" lang="en" dir="ltr" class="space-y-3"><legend class="mb-2 text-sm font-semibold text-[#d4a077]">English</legend>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Title' | adminText }}<input class="${fieldClass}" required [(ngModel)]="model.titleEn" name="titleEn"></label><label class="block text-xs text-[#a0a0a0]">{{ 'Slug' | adminText }}<input class="${fieldClass}" required [(ngModel)]="model.slugEn" name="slugEn"></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Category' | adminText }}<input class="${fieldClass}" maxlength="120" [(ngModel)]="model.categoryEn" name="categoryEn"></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Overview' | adminText }}<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.descriptionEn" name="descriptionEn"></textarea></label><label class="block text-xs text-[#a0a0a0]">{{ 'Challenge' | adminText }}<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.challengeEn" name="challengeEn"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Approach' | adminText }}<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.approachEn" name="approachEn"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Solution' | adminText }}<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.solutionEn" name="solutionEn"></textarea></label><label class="block text-xs text-[#a0a0a0]">{{ 'Results' | adminText }}<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.resultsEn" name="resultsEn"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'SEO title' | adminText }}<input class="${fieldClass}" [(ngModel)]="model.seoTitleEn" name="seoTitleEn"></label><label class="block text-xs text-[#a0a0a0]">{{ 'SEO description' | adminText }}<textarea class="${fieldClass}" rows="2" [(ngModel)]="model.seoDescriptionEn" name="seoDescriptionEn"></textarea></label>
          </fieldset>
          <fieldset [hidden]="editingLanguage !== 'ar'" lang="ar" class="space-y-3" dir="rtl"><legend class="mb-2 text-sm font-semibold text-[#d4a077]">العربية</legend>
            <label class="block text-xs text-[#a0a0a0]">العنوان<input class="${fieldClass}" required [(ngModel)]="model.titleAr" name="titleAr"></label><label class="block text-xs text-[#a0a0a0]">الرابط المختصر<input class="${fieldClass}" required [(ngModel)]="model.slugAr" name="slugAr"></label>
            <label class="block text-xs text-[#a0a0a0]">التصنيف<input class="${fieldClass}" maxlength="120" [(ngModel)]="model.categoryAr" name="categoryAr"></label>
            <label class="block text-xs text-[#a0a0a0]">الملخص<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.descriptionAr" name="descriptionAr"></textarea></label><label class="block text-xs text-[#a0a0a0]">التحدي<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.challengeAr" name="challengeAr"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">نهجنا<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.approachAr" name="approachAr"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">الحل<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.solutionAr" name="solutionAr"></textarea></label><label class="block text-xs text-[#a0a0a0]">النتائج<textarea class="${fieldClass}" rows="3" [(ngModel)]="model.resultsAr" name="resultsAr"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">عنوان SEO<input class="${fieldClass}" [(ngModel)]="model.seoTitleAr" name="seoTitleAr"></label><label class="block text-xs text-[#a0a0a0]">وصف SEO<textarea class="${fieldClass}" rows="2" [(ngModel)]="model.seoDescriptionAr" name="seoDescriptionAr"></textarea></label>
          </fieldset>
        </div>
        <div class="grid gap-4 sm:grid-cols-2"><label class="block text-xs text-[#a0a0a0]">{{ 'Client' | adminText }}<input class="${fieldClass}" [(ngModel)]="model.client" name="client"></label><label class="block text-xs text-[#a0a0a0]">{{ 'Cover image URL' | adminText }}<input class="${fieldClass}" type="url" [(ngModel)]="model.coverImageUrl" name="coverImageUrl"></label></div>
        <fieldset class="rounded-xl border border-white/10 p-4"><legend class="px-2 text-sm font-semibold">{{ 'Services used' | adminText }}</legend><div class="flex flex-wrap gap-x-5 gap-y-3">@for (service of services; track service.id) { <label class="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" [checked]="model.serviceIds.includes(service.id)" (change)="toggleService(service.id, $event)">{{service.titleEn}} <span class="text-[#a0a0a0]">/ {{service.titleAr}}</span></label> } @if (!services.length) {<span class="text-xs text-[#a0a0a0]">{{ 'Create a service to link it here.' | adminText }}</span>}</div></fieldset>
        <div class="grid gap-4 sm:grid-cols-3"><label class="block text-xs text-[#a0a0a0]">{{ 'Project date' | adminText }}<input class="${fieldClass}" type="date" [(ngModel)]="model.projectDate" name="projectDate"></label><label class="block text-xs text-[#a0a0a0]">{{ 'Display order' | adminText }}<input class="${fieldClass}" type="number" [(ngModel)]="model.displayOrder" name="displayOrder"></label><div class="flex gap-5 pb-3 text-sm"><label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="model.isFeatured" name="featured"> {{ 'Featured' | adminText }}</label><label class="flex items-center gap-2"><input type="checkbox" [(ngModel)]="model.isPublished" name="published"> {{ 'Published' | adminText }}</label></div></div>
        <div class="space-y-3 rounded-xl border border-white/10 p-4"><div class="flex items-center justify-between"><div><h3 class="text-sm font-semibold">{{ 'Project gallery' | adminText }}</h3><p class="mt-1 text-xs text-[#a0a0a0]">{{ 'Image URLs and accessible text for both languages.' | adminText }}</p></div><button type="button" (click)="addImage()" class="rounded-lg border border-[#d4a077]/30 px-3 py-2 text-xs text-[#d4a077]">{{ 'Add image' | adminText }}</button></div>
          <div *ngFor="let image of model.images; let i=index" class="grid gap-2 rounded-lg bg-black/20 p-3 md:grid-cols-[1.3fr_1fr_1fr_70px_auto]">
            <input class="${fieldClass}" type="url" [placeholder]="'Image URL' | adminText" [(ngModel)]="image.imageUrl" [name]="'image'+i"><input class="${fieldClass}" [placeholder]="'Alt text EN' | adminText" [(ngModel)]="image.altTextEn" [name]="'altEn'+i"><input class="${fieldClass}" dir="rtl" placeholder="النص البديل" [(ngModel)]="image.altTextAr" [name]="'altAr'+i"><input class="${fieldClass}" type="number" [title]="'Display order' | adminText" [(ngModel)]="image.displayOrder" [name]="'order'+i"><button type="button" (click)="removeImage(i)" [attr.aria-label]="'Remove image' | adminText" class="text-sm text-rose-200">{{ 'Remove' | adminText }}</button>
          </div><p *ngIf="!model.images.length" class="text-xs text-[#a0a0a0]">{{ 'No gallery images added.' | adminText }}</p>
        </div>
        <div class="flex justify-end gap-3"><button type="button" (click)="editing=false" class="rounded-xl border border-white/15 px-4 py-2 text-sm">{{ 'Cancel' | adminText }}</button><button [disabled]="saving || editorForm.invalid" class="rounded-xl bg-[#d4a077] px-5 py-2 text-sm font-semibold text-[#17120e]">{{ (saving ? 'Saving…' : 'Save project') | adminText }}</button></div>
      </form>
      <div class="flex flex-wrap gap-3"><label class="flex-1 min-w-40 text-xs text-[#a0a0a0]">{{ 'Search' | adminText }}<input [(ngModel)]="query" (ngModelChange)="page=0" name="portfolio-search" autocomplete="off" class="${fieldClass}" type="search"></label><label class="text-xs text-[#a0a0a0]">{{ 'Status' | adminText }}<select [(ngModel)]="statusFilter" (ngModelChange)="page=0" class="${fieldClass}"><option value="all">{{ 'All statuses' | adminText }}</option><option value="published">{{ 'Published' | adminText }}</option><option value="draft">{{ 'Draft' | adminText }}</option></select></label></div><div class="flex items-center justify-between text-xs text-[#a0a0a0]"><span>{{filteredItems.length}} {{ 'results' | adminText }}</span><div class="flex items-center gap-4"><button [disabled]="page===0" (click)="page=page-1">{{ 'Previous' | adminText }}</button><span>{{page+1}} / {{totalPages}}</span><button [disabled]="page>=totalPages-1" (click)="page=page+1">{{ 'Next' | adminText }}</button></div></div><div class="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]/[.02]">
        <div *ngFor="let item of pageItems" class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 last:border-0"><div><h2 class="font-medium">{{item.titleEn}} <span class="text-[#a0a0a0]">/ {{item.titleAr}}</span></h2><p class="mt-1 text-xs text-[#a0a0a0]">{{item.categoryEn || item.client || ('Uncategorized' | adminText)}} · /{{item.slugEn}} · {{ (item.isPublished ? 'Published' : 'Draft') | adminText }} · {{item.images.length}} {{'gallery images' | adminText}}</p><p class="mt-1 text-xs" [class.text-emerald-200]="translationComplete(item)" [class.text-amber-200]="!translationComplete(item)">{{ (translationComplete(item) ? 'translation.complete' : 'translation.missing') | adminText }}</p></div><div class="cms-row-actions"><button type="button" (click)="edit(item)" class="cms-action cms-action--edit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z M14 5l5 5" /></svg>{{ 'Edit' | adminText }}</button><button type="button" (click)="remove(item)" class="cms-action cms-action--delete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7" /></svg>{{ 'Delete' | adminText }}</button></div></div>
        <p *ngIf="!filteredItems.length" class="p-8 text-center text-sm text-[#a0a0a0]">{{ 'No projects yet. Add the first case study.' | adminText }}</p>
      </div>
    </section>`
})
export class AdminPortfolioPage implements OnInit {
  query = ''; statusFilter = 'all'; page = 0; readonly pageSize = 10;
  get filteredItems(): PortfolioItem[] { const q = this.query.trim().toLocaleLowerCase(); return this.items.filter(item => (!q || [item.titleEn,item.titleAr,item.slugEn,item.slugAr].some(value => value.toLocaleLowerCase().includes(q))) && (this.statusFilter === 'all' || item.isPublished === (this.statusFilter === 'published'))); }
  get pageItems(): PortfolioItem[] { return this.filteredItems.slice(this.page*this.pageSize,(this.page+1)*this.pageSize); }
  get totalPages(): number { return Math.max(1,Math.ceil(this.filteredItems.length/this.pageSize)); }

  editingLanguage: 'en' | 'ar' = 'en';
  private readonly http = inject(HttpClient); private readonly cdr = inject(ChangeDetectorRef);
  private readonly locale = inject(AdminLocaleService);
  private portfolioLoadVersion = 0;
  items: PortfolioItem[] = []; editing = false; saving = false; error = '';
  services: ServiceOption[] = [];
  model: PortfolioItem = this.empty();
  ngOnInit(): void { this.load(); }
  private empty(): PortfolioItem { return { id: '', titleEn: '', titleAr: '', slugEn: '', slugAr: '', client: '', categoryEn: '', categoryAr: '', descriptionEn: '', descriptionAr: '', challengeEn: '', challengeAr: '', approachEn: '', approachAr: '', solutionEn: '', solutionAr: '', resultsEn: '', resultsAr: '', coverImageUrl: '', projectDate: null, displayOrder: 0, isFeatured: false, isPublished: false, seoTitleEn: '', seoTitleAr: '', seoDescriptionEn: '', seoDescriptionAr: '', images: [], serviceIds: [] }; }
  translationComplete(item: PortfolioItem): boolean { return !!(item.titleAr.trim() && item.slugAr.trim() && item.descriptionAr?.trim()); }
  load(): void {
    this.loadPortfolio();
    this.http.get<ServiceOption[]>('/api/admin/services').subscribe({ next: (items) => { this.services = items; this.cdr.markForCheck(); }, error: () => { this.error = 'Could not load services for project links.'; this.cdr.markForCheck(); } });
  }
  private loadPortfolio(): void {
    const loadVersion = ++this.portfolioLoadVersion;
    this.http.get<PortfolioItem[]>('/api/admin/portfolio').subscribe({
      next: (items) => {
        if (loadVersion !== this.portfolioLoadVersion) return;
        this.items = items;
        this.cdr.markForCheck();
      },
      error: () => {
        if (loadVersion !== this.portfolioLoadVersion) return;
        this.error = 'Could not load projects. Please sign in again and retry.';
        this.cdr.markForCheck();
      }
    });
  }
  startNew(): void { this.model = this.empty(); this.error = ''; this.editing = true; }
  edit(item: PortfolioItem): void { this.model = { ...item, images: item.images.map(image => ({ ...image })) }; this.error = ''; this.editing = true; }
  addImage(): void { this.model.images.push({ imageUrl: '', altTextEn: '', altTextAr: '', displayOrder: this.model.images.length }); }
  removeImage(index: number): void { this.model.images.splice(index, 1); }
  toggleService(id: string, event: Event): void {
    const selected = (event.target as HTMLInputElement).checked;
    this.model.serviceIds = selected ? [...this.model.serviceIds, id] : this.model.serviceIds.filter(item => item !== id);
  }
  save(): void {
    if (this.saving) return;
    this.saving = true; this.error = '';
    const { id, ...payload } = this.model;
    const request = id ? this.http.put<PortfolioItem>(`/api/admin/portfolio/${id}`, payload) : this.http.post<PortfolioItem>('/api/admin/portfolio', payload);
    request.subscribe({
      next: (saved) => {
        // The POST/PUT response is the confirmed persisted record. Reconcile it directly so
        // an older in-flight GET cannot overwrite the list with stale data after a save.
        this.portfolioLoadVersion++;
        this.items = [...this.items.filter(item => item.id !== saved.id), saved]
          .sort((left, right) => left.displayOrder - right.displayOrder || left.titleEn.localeCompare(right.titleEn));
        this.query = '';
        this.statusFilter = 'all';
        this.page = 0;
        this.saving = false;
        this.editing = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.saving = false;
        this.error = e.status === 409 ? 'That English or Arabic slug is already in use.' : 'Could not save the project. Check the fields and try again.';
        this.cdr.markForCheck();
      }
    });
  }
  remove(item: PortfolioItem): void { if (window.confirm(this.locale.text('confirm.deleteProject').replace('{title}', item.titleEn))) this.http.delete(`/api/admin/portfolio/${item.id}`).subscribe({ next: () => this.load(), error: () => this.error = 'Could not delete this project.' }); }
}

@Component({
  standalone: true, imports: [CommonModule, FormsModule, AdminTextPipe],
  template: `
    <section class="space-y-7">
      <header class="flex flex-wrap items-end justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[.22em] text-[#d4a077]">{{ 'Editorial studio' | adminText }}</p><h1 class="mt-2 text-3xl font-semibold">{{ 'Articles' | adminText }}</h1><p class="mt-2 text-sm text-[#a0a0a0]">{{ 'Write bilingual articles, prepare drafts, and manage publishing and SEO.' | adminText }}</p></div><button type="button" (click)="startNew()" class="rounded-xl bg-[#d4a077] px-4 py-2.5 text-sm font-semibold text-[#17120e]">{{ 'Write article' | adminText }}</button></header>
      <p *ngIf="error && !editing" role="alert" class="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{{error | adminText}}</p>
      <form *ngIf="editing" (ngSubmit)="save(editorForm)" #editorForm="ngForm" novalidate class="space-y-5 rounded-2xl border border-white/10 bg-[#141414]/[.03] p-5 sm:p-7">
        <div class="flex items-center justify-between"><h2 class="text-lg font-semibold">{{ (model.id ? 'Edit article' : 'New article') | adminText }}</h2><button type="button" (click)="editing=false" class="text-sm text-[#a0a0a0]">{{ 'Close' | adminText }}</button></div>
        <p *ngIf="error" role="alert" class="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{{error | adminText}}</p>
        <div class="cms-language-tabs"><button type="button" (click)="editingLanguage='en'" [attr.aria-pressed]="editingLanguage==='en'">English</button><button type="button" (click)="editingLanguage='ar'" [attr.aria-pressed]="editingLanguage==='ar'">العربية</button></div><p class="cms-field-hint">{{ 'Complete both language tabs before saving.' | adminText }}</p><div class="grid gap-5 md:grid-cols-2">
          <fieldset [hidden]="editingLanguage !== 'en'" lang="en" dir="ltr" class="space-y-3"><legend class="mb-2 text-sm font-semibold text-[#d4a077]">English</legend>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Title' | adminText }}<input class="${fieldClass}" required maxlength="250" [(ngModel)]="model.titleEn" name="titleEn"></label><p *ngIf="invalid(editorForm, 'titleEn')" class="text-xs text-rose-200">{{ 'English title is required.' | adminText }}</p><p *ngIf="serverError('titleEn') as message" class="text-xs text-rose-200">{{message}}</p><label class="block text-xs text-[#a0a0a0]">{{ 'Slug' | adminText }}<input class="${fieldClass}" required maxlength="180" [(ngModel)]="model.slugEn" name="slugEn"></label><p *ngIf="invalid(editorForm, 'slugEn')" class="text-xs text-rose-200">{{ 'English slug is required.' | adminText }}</p><p *ngIf="serverError('slugEn') as message" class="text-xs text-rose-200">{{message}}</p>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Excerpt' | adminText }}<textarea class="${fieldClass}" rows="3" maxlength="500" [(ngModel)]="model.excerptEn" name="excerptEn"></textarea></label><label class="block text-xs text-[#a0a0a0]">{{ 'Article content (plain text or Markdown)' | adminText }}<textarea class="${fieldClass}" rows="12" [(ngModel)]="model.contentEn" name="contentEn"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'SEO title' | adminText }}<input class="${fieldClass}" maxlength="250" [(ngModel)]="model.seoTitleEn" name="seoTitleEn"></label><label class="block text-xs text-[#a0a0a0]">{{ 'SEO description' | adminText }}<textarea class="${fieldClass}" rows="2" maxlength="500" [(ngModel)]="model.seoDescriptionEn" name="seoDescriptionEn"></textarea></label>
          </fieldset>
          <fieldset [hidden]="editingLanguage !== 'ar'" lang="ar" class="space-y-3" dir="rtl"><legend class="mb-2 text-sm font-semibold text-[#d4a077]">العربية</legend>
            <label class="block text-xs text-[#a0a0a0]">العنوان<input class="${fieldClass}" required maxlength="250" [(ngModel)]="model.titleAr" name="titleAr"></label><p *ngIf="invalid(editorForm, 'titleAr')" class="text-xs text-rose-200">{{ 'Arabic title is required.' | adminText }}</p><p *ngIf="serverError('titleAr') as message" class="text-xs text-rose-200">{{message}}</p><label class="block text-xs text-[#a0a0a0]">الرابط المختصر<input class="${fieldClass}" required maxlength="180" [(ngModel)]="model.slugAr" name="slugAr"></label><p *ngIf="invalid(editorForm, 'slugAr')" class="text-xs text-rose-200">{{ 'Arabic slug is required.' | adminText }}</p><p *ngIf="serverError('slugAr') as message" class="text-xs text-rose-200">{{message}}</p>
            <label class="block text-xs text-[#a0a0a0]">مقدمة المقال<textarea class="${fieldClass}" rows="3" maxlength="500" [(ngModel)]="model.excerptAr" name="excerptAr"></textarea></label><label class="block text-xs text-[#a0a0a0]">محتوى المقال (نص أو Markdown)<textarea class="${fieldClass}" rows="12" [(ngModel)]="model.contentAr" name="contentAr"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">عنوان SEO<input class="${fieldClass}" maxlength="250" [(ngModel)]="model.seoTitleAr" name="seoTitleAr"></label><label class="block text-xs text-[#a0a0a0]">وصف SEO<textarea class="${fieldClass}" rows="2" maxlength="500" [(ngModel)]="model.seoDescriptionAr" name="seoDescriptionAr"></textarea></label>
          </fieldset>
        </div>
        <div class="grid gap-4 sm:grid-cols-3"><div><label class="block text-xs text-[#a0a0a0]">{{ 'Author' | adminText }}<input class="${fieldClass}" required maxlength="160" [(ngModel)]="model.authorName" name="authorName" [placeholder]="'Enter author name' | adminText"></label><p *ngIf="invalid(editorForm, 'authorName')" class="mt-1 text-xs text-rose-200">{{ 'Enter an author name before saving.' | adminText }}</p></div><label class="block text-xs text-[#a0a0a0]">{{ 'Cover image URL' | adminText }}<input class="${fieldClass}" type="url" maxlength="2048" [(ngModel)]="model.coverImageUrl" name="coverImageUrl"></label><label class="block text-xs text-[#a0a0a0]">{{ 'Publication date' | adminText }}<input class="${fieldClass}" type="datetime-local" [(ngModel)]="model.publishedAt" name="publishedAt"></label></div>
        <div class="flex justify-end gap-3"><button type="button" (click)="editing=false" class="rounded-xl border border-white/15 px-4 py-2 text-sm">{{ 'Cancel' | adminText }}</button><button type="submit" [disabled]="saving" class="rounded-xl bg-[#d4a077] px-5 py-2 text-sm font-semibold text-[#17120e]">{{ (saving ? 'Saving…' : 'Save draft') | adminText }}</button><button type="button" (click)="publish(editorForm)" [disabled]="saving" class="rounded-xl border border-[#d4a077]/30 px-5 py-2 text-sm font-semibold text-[#e0b796]">{{ 'Publish' | adminText }}</button></div>
      </form>
      <div class="flex flex-wrap gap-3"><label class="flex-1 min-w-40 text-xs text-[#a0a0a0]">{{ 'Search' | adminText }}<input [(ngModel)]="query" (ngModelChange)="page=0" class="${fieldClass}" type="search"></label><label class="text-xs text-[#a0a0a0]">{{ 'Status' | adminText }}<select [(ngModel)]="statusFilter" (ngModelChange)="page=0" class="${fieldClass}"><option value="all">{{ 'All statuses' | adminText }}</option><option value="published">{{ 'Published' | adminText }}</option><option value="draft">{{ 'Draft' | adminText }}</option></select></label></div><div class="flex items-center justify-between text-xs text-[#a0a0a0]"><span>{{filteredItems.length}} {{ 'results' | adminText }}</span><div class="flex items-center gap-4"><button [disabled]="page===0" (click)="page=page-1">{{ 'Previous' | adminText }}</button><span>{{page+1}} / {{totalPages}}</span><button [disabled]="page>=totalPages-1" (click)="page=page+1">{{ 'Next' | adminText }}</button></div></div><div class="overflow-hidden rounded-2xl border border-white/10 bg-[#141414]/[.02]"><div *ngFor="let item of pageItems" class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 last:border-0"><div><h2 class="font-medium">{{item.titleEn}} <span class="text-[#a0a0a0]">/ {{item.titleAr}}</span></h2><p class="mt-1 text-xs text-[#a0a0a0]">{{'By' | adminText}} {{item.authorName}} · /{{item.slugEn}} · {{ (item.isPublished ? 'Published' : 'Draft') | adminText }}</p><p class="mt-1 text-xs" [class.text-emerald-200]="translationComplete(item)" [class.text-amber-200]="!translationComplete(item)">{{ (translationComplete(item) ? 'translation.complete' : 'translation.missing') | adminText }}</p></div><div class="cms-row-actions"><button type="button" (click)="edit(item)" class="cms-action cms-action--edit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5-12 12-6 1 1-6L16 3Z M14 5l5 5" /></svg>{{ 'Edit' | adminText }}</button><button type="button" (click)="remove(item)" class="cms-action cms-action--delete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7" /></svg>{{ 'Delete' | adminText }}</button></div></div><p *ngIf="!filteredItems.length" class="p-8 text-center text-sm text-[#a0a0a0]">{{ 'No articles yet. Start your first editorial story.' | adminText }}</p></div>
    </section>`
})
export class AdminArticlesPage implements OnInit {
  query = ''; statusFilter = 'all'; page = 0; readonly pageSize = 10;
  get filteredItems(): ArticleItem[] { const q = this.query.trim().toLocaleLowerCase(); return this.items.filter(item => (!q || [item.titleEn,item.titleAr,item.slugEn,item.slugAr].some(value => value.toLocaleLowerCase().includes(q))) && (this.statusFilter === 'all' || item.isPublished === (this.statusFilter === 'published'))); }
  get pageItems(): ArticleItem[] { return this.filteredItems.slice(this.page*this.pageSize,(this.page+1)*this.pageSize); }
  get totalPages(): number { return Math.max(1,Math.ceil(this.filteredItems.length/this.pageSize)); }

  editingLanguage: 'en' | 'ar' = 'en';
  private readonly http = inject(HttpClient); private readonly cdr = inject(ChangeDetectorRef);
  private readonly locale = inject(AdminLocaleService);
  items: ArticleItem[] = []; editing = false; saving = false; error = ''; serverErrors: Record<string, string[]> = {};
  model: ArticleItem = this.empty();
  ngOnInit(): void { this.load(); }
  private empty(): ArticleItem { return { id: '', titleEn: '', titleAr: '', slugEn: '', slugAr: '', excerptEn: '', excerptAr: '', contentEn: '', contentAr: '', coverImageUrl: '', authorId: '', authorName: '', publishedAt: null, isPublished: false, seoTitleEn: '', seoTitleAr: '', seoDescriptionEn: '', seoDescriptionAr: '' }; }
  translationComplete(item: ArticleItem): boolean { return !!(item.titleAr.trim() && item.slugAr.trim() && (item.contentAr?.trim() || item.excerptAr?.trim())); }
  load(): void {
    this.http.get<ArticleItem[]>('/api/admin/articles').subscribe({ next: items => { this.items = items; this.cdr.markForCheck(); }, error: () => { this.error = 'Could not load articles. Please sign in again and retry.'; this.cdr.markForCheck(); } });
  }
  startNew(): void { this.model = this.empty(); this.error = ''; this.serverErrors = {}; this.editing = true; }
  edit(item: ArticleItem): void { this.model = { ...item, publishedAt: item.publishedAt ? item.publishedAt.slice(0, 16) : null }; this.error = ''; this.serverErrors = {}; this.editing = true; }
  invalid(form: NgForm, name: string): boolean { const control = form.controls[name]; return !!control && control.invalid && (control.touched || form.submitted); }
  serverError(name: string): string | null { return this.serverErrors[name]?.[0] ?? null; }
  save(form: NgForm): void { this.submit(this.model.isPublished, form); }
  publish(form: NgForm): void { this.submit(true, form); }
  private submit(published: boolean, form: NgForm): void {
    if (this.saving) return;
    if (form.invalid || !this.model.authorName.trim()) {
      form.control.markAllAsTouched();
      if (form.controls['titleEn']?.invalid || form.controls['slugEn']?.invalid) this.editingLanguage = 'en';
      else if (form.controls['titleAr']?.invalid || form.controls['slugAr']?.invalid) this.editingLanguage = 'ar';
      this.error = 'Review the highlighted required fields.';
      this.cdr.markForCheck();
      return;
    }
    this.saving = true; this.error = ''; this.serverErrors = {};
    const { id, authorId, ...rawPayload } = { ...this.model, isPublished: published };
    const optional = (value: string | null) => value?.trim() || null;
    const payload = { ...rawPayload, authorName: rawPayload.authorName.trim(), excerptEn: optional(rawPayload.excerptEn), excerptAr: optional(rawPayload.excerptAr), contentEn: optional(rawPayload.contentEn), contentAr: optional(rawPayload.contentAr), coverImageUrl: optional(rawPayload.coverImageUrl), seoTitleEn: optional(rawPayload.seoTitleEn), seoTitleAr: optional(rawPayload.seoTitleAr), seoDescriptionEn: optional(rawPayload.seoDescriptionEn), seoDescriptionAr: optional(rawPayload.seoDescriptionAr) };
    const request = id ? this.http.put<ArticleItem>(`/api/admin/articles/${id}`, payload) : this.http.post<ArticleItem>('/api/admin/articles', payload);
    request.subscribe({ next: () => { this.saving = false; this.editing = false; this.load(); this.cdr.markForCheck(); }, error: e => { this.saving = false; this.serverErrors = this.articleFieldErrors(e?.error?.errors); this.error = this.articleSaveError(e); this.cdr.markForCheck(); } });
  }
  private articleFieldErrors(errors: Record<string, string[]> | undefined): Record<string, string[]> {
    if (!errors) return {};
    return Object.fromEntries(Object.entries(errors).map(([name, messages]) => [name.replace(/^\$?\.?/, '').replace(/^./, character => character.toLowerCase()), messages]));
  }
  private articleSaveError(error: { status?: number; error?: { title?: string; errors?: Record<string, string[]> } }): string {
    if (error.status === 409 && (error.error?.title === 'Select an active author.' || error.error?.title === 'Enter an author name between 1 and 160 characters.')) return 'Enter an author name before saving.';
    if (error.status === 409) return 'That English or Arabic slug is already in use.';
    if (error.status === 400 && error.error?.errors) return 'The API rejected one or more article fields. Review the highlighted fields.';
    if (error.status === 401) return 'Your admin session expired. Sign in again to save the article.';
    if (error.status === 403) return 'Your account does not have permission to save articles.';
    return 'Could not save the article. Check the required fields and author.';
  }
  remove(item: ArticleItem): void { if (window.confirm(this.locale.text('confirm.delete').replace('{title}', item.titleEn))) this.http.delete(`/api/admin/articles/${item.id}`).subscribe({ next: () => this.load(), error: () => this.error = 'Could not delete this article.' }); }
}