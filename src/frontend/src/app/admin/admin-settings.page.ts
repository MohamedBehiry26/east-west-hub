import { createCmsConcurrency, versionedDeleteUrl } from './admin-concurrency-state';
import { AdminConcurrencyComponent } from './admin-concurrency.component';
import { AdminFieldFeedbackDirective } from './admin-field-feedback.directive';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { settingsFeedback } from './admin-simple-feedback';
import { publishFieldErrors } from './admin-field-feedback.directive';
import { ElementRef } from '@angular/core';
import { AdminLocaleService } from '../core/admin-locale.service';
import { AdminTextPipe } from '../core/admin-text.pipe';

interface SocialLink { platform: string; url: string; displayOrder: number; isVisible: boolean; }
interface SiteSettings { exists?:boolean; version?: string;
  heroMp4Url?: string | null;
  heroPosterImageUrl?: string | null;
  heroVideoUrl?: string | null;
  agencyNameEn: string; agencyNameAr: string; agencyDescriptionEn: string | null; agencyDescriptionAr: string | null;
  logoUrl: string | null; faviconUrl: string | null; email: string | null; phone: string | null;
  addressEn: string | null; addressAr: string | null;
  defaultSeoTitleEn: string | null; defaultSeoTitleAr: string | null; defaultSeoDescriptionEn: string | null; defaultSeoDescriptionAr: string | null; socialLinks: SocialLink[];
}
const field = 'mt-1 w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4a077]';

@Component({
  standalone: true, imports: [AdminConcurrencyComponent,AdminFieldFeedbackDirective, CommonModule, FormsModule, AdminTextPipe],
  template: `
    <section class="space-y-7"><admin-concurrency [state]="concurrency" />
      <header><p class="text-xs font-semibold uppercase tracking-[.22em] text-[#d4a077]">{{ 'Site configuration' | adminText }}</p><h1 class="mt-2 text-3xl font-semibold">{{ 'Settings' | adminText }}</h1><p class="mt-2 text-sm text-[#a0a0a0]">{{ 'Update public agency details and social links in both languages.' | adminText }}</p></header>
      <div class="flex flex-wrap gap-3 text-xs"><span class="rounded-full border border-white/10 px-3 py-2" [class.text-emerald-200]="translationComplete('en')" [class.text-amber-200]="!translationComplete('en')">English {{ (translationComplete('en') ? 'translation.completeSettings' : 'translation.missingSettings') | adminText }}</span><span class="rounded-full border border-white/10 px-3 py-2" [class.text-emerald-200]="translationComplete('ar')" [class.text-amber-200]="!translationComplete('ar')">Arabic {{ (translationComplete('ar') ? 'translation.completeSettings' : 'translation.missingSettings') | adminText }}</span></div>
      <p *ngIf="message" role="status" class="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">{{message | adminText}}</p>
      <p *ngIf="error" role="alert" class="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{{error | adminText}}</p>
      <p *ngIf="loading" role="status" aria-live="polite" class="text-sm text-[#a0a0a0]">{{loadCopy.loading}}</p>
      <div *ngIf="!loading && !initialized" class="space-y-3">
        <p role="alert" class="text-sm text-rose-200">{{loadCopy.error}}</p>
        <button type="button" (click)="load()" class="rounded-xl border border-[#d4a077]/40 px-4 py-2 text-sm text-[#d4a077]">{{loadCopy.retry}}</button>
      </div>
      <form novalidate [adminFieldFeedback]="fieldValidation" #settingsForm="ngForm" (ngSubmit)="save(settingsForm)" [attr.aria-busy]="loading || saving" class="space-y-6 rounded-2xl border border-white/10 bg-[#141414]/[.03] p-5 sm:p-7">
        <fieldset [disabled]="!initialized || loading || saving" class="space-y-6 min-w-0">
        <div class="grid gap-5 md:grid-cols-2">
          <fieldset class="space-y-3"><legend class="mb-2 text-sm font-semibold text-[#d4a077]">English</legend>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Agency name' | adminText }}<input class="${field}" required maxlength="160" [(ngModel)]="model.agencyNameEn" name="nameEn"></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Agency description' | adminText }}<textarea class="${field}" rows="4" maxlength="2000" [(ngModel)]="model.agencyDescriptionEn" name="descriptionEn"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">{{ 'Address' | adminText }}<input class="${field}" maxlength="500" [(ngModel)]="model.addressEn" name="addressEn"></label>
          </fieldset>
          <fieldset class="space-y-3" dir="rtl"><legend class="mb-2 text-sm font-semibold text-[#d4a077]">العربية</legend>
            <label class="block text-xs text-[#a0a0a0]">اسم الوكالة<input class="${field}" required maxlength="160" [(ngModel)]="model.agencyNameAr" name="nameAr"></label>
            <label class="block text-xs text-[#a0a0a0]">نبذة عن الوكالة<textarea class="${field}" rows="4" maxlength="2000" [(ngModel)]="model.agencyDescriptionAr" name="descriptionAr"></textarea></label>
            <label class="block text-xs text-[#a0a0a0]">العنوان<input class="${field}" maxlength="500" [(ngModel)]="model.addressAr" name="addressAr"></label>
          </fieldset>
        </div>
        <div class="grid gap-4 sm:grid-cols-2"><label class="block text-xs text-[#a0a0a0]">{{ 'Contact email' | adminText }}<input class="${field}" type="email" maxlength="320" [(ngModel)]="model.email" name="email"></label><label class="block text-xs text-[#a0a0a0]">{{ 'Phone' | adminText }}<input class="${field}" type="tel" maxlength="40" [(ngModel)]="model.phone" name="phone"></label><div><label class="block text-xs text-[#a0a0a0]">{{ 'Logo image URL' | adminText }}<input class="${field}" type="url" maxlength="2048" [(ngModel)]="model.logoUrl" name="logo"></label></div><div><label class="block text-xs text-[#a0a0a0]">{{ 'Favicon URL' | adminText }}<input class="${field}" type="url" maxlength="2048" [(ngModel)]="model.faviconUrl" name="favicon"></label></div></div>

        <section class="space-y-3 rounded-xl border border-[#d4a077]/25 p-4"><h2 class="font-semibold">{{'Homepage hero video' | adminText}}</h2>
          <label class="block text-xs text-[#a0a0a0]">{{heroCopy.mp4}}<input class="${field}" maxlength="2048" [(ngModel)]="model.heroMp4Url" name="heroMp4Url" placeholder="https://…/showreel.mp4" dir="ltr"></label>
          <div><label class="block text-xs text-[#a0a0a0]">{{heroCopy.poster}}<input class="${field}" maxlength="2048" [(ngModel)]="model.heroPosterImageUrl" name="heroPosterImageUrl" placeholder="/branding/hero-poster.webp" dir="ltr"></label></div>
          <p class="text-xs leading-6 text-[#a0a0a0]">{{heroCopy.hint}}</p><label class="block text-xs text-[#a0a0a0]">{{'YouTube video URL' | adminText}}<input class="${field}" type="url" maxlength="2048" [(ngModel)]="model.heroVideoUrl" name="heroVideoUrl" placeholder="https://www.youtube.com/watch?v=…" dir="ltr"></label></section>
        <section class="space-y-4 rounded-xl border border-white/10 p-4"><h2 class="font-semibold">{{'Default SEO metadata' | adminText}}</h2><div class="grid gap-4 md:grid-cols-2"><fieldset class="space-y-3"><legend class="text-sm text-[#a0a0a0]">English</legend><label class="block text-xs text-[#a0a0a0]">{{'SEO title' | adminText}}<input class="${field}" maxlength="250" [(ngModel)]="model.defaultSeoTitleEn" name="defaultSeoTitleEn"></label><label class="block text-xs text-[#a0a0a0]">{{'SEO description' | adminText}}<textarea class="${field}" maxlength="500" rows="3" [(ngModel)]="model.defaultSeoDescriptionEn" name="defaultSeoDescriptionEn"></textarea></label></fieldset><fieldset class="space-y-3" dir="rtl"><legend class="text-sm text-[#a0a0a0]">العربية</legend><label class="block text-xs text-[#a0a0a0]">عنوان SEO<input class="${field}" maxlength="250" [(ngModel)]="model.defaultSeoTitleAr" name="defaultSeoTitleAr"></label><label class="block text-xs text-[#a0a0a0]">وصف SEO<textarea class="${field}" maxlength="500" rows="3" [(ngModel)]="model.defaultSeoDescriptionAr" name="defaultSeoDescriptionAr"></textarea></label></fieldset></div></section>
        <fieldset class="space-y-3 rounded-xl border border-white/10 p-4"><div class="flex items-center justify-between"><legend class="text-sm font-semibold">{{ 'Social links' | adminText }}</legend><button type="button" (click)="addLink()" class="rounded-lg border border-[#d4a077]/30 px-3 py-2 text-xs text-[#d4a077]">{{ 'Add link' | adminText }}</button></div>
          <div *ngFor="let link of model.socialLinks; let i=index" class="grid gap-2 rounded-lg bg-black/20 p-3 sm:grid-cols-[.8fr_1.8fr_90px_auto_auto]"><select class="${field}" [(ngModel)]="link.platform" [name]="'platform'+i" [attr.name]="'platform'+i"><option value="YouTube">YouTube</option><option value="Instagram">Instagram</option><option value="LinkedIn">LinkedIn</option><option value="Facebook">Facebook</option><option value="X">X</option><option value="TikTok">TikTok</option></select><input class="${field}" type="url" required placeholder="https://…" [(ngModel)]="link.url" [name]="'url'+i" [attr.name]="'url'+i"><input class="${field}" type="number" [title]="'Display order' | adminText" [(ngModel)]="link.displayOrder" [name]="'order'+i" [attr.name]="'order'+i"><label class="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" [(ngModel)]="link.isVisible" [name]="'visible'+i" [attr.name]="'visible'+i">{{ 'Visible' | adminText }}</label><button type="button" (click)="removeLink(i)" class="cms-action cms-action--delete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7" /></svg>{{ 'Remove' | adminText }}</button></div>
          <p *ngIf="!model.socialLinks.length" class="text-xs text-[#a0a0a0]">{{ 'No social links configured.' | adminText }}</p>
        </fieldset>
        <div class="flex justify-end"><button type="submit" [disabled]="!initialized || loading || saving || concurrency.blocked() || settingsForm.invalid || !requiredNamesValid" class="rounded-xl bg-[#d4a077] px-5 py-2.5 text-sm font-semibold text-[#17120e]">{{ (saving ? 'Saving…' : 'Save settings') | adminText }}</button></div>
        </fieldset>
      </form>
    </section>`
})
export class AdminSettingsPage implements OnInit {
  readonly concurrency=createCmsConcurrency();
  readonly fieldValidation = () => settingsFeedback(this.model);
  private readonly root=inject(ElementRef<HTMLElement>);
  private readonly locale=inject(AdminLocaleService);
  get heroCopy() { return this.locale.locale()==='ar'
    ? {mp4:'رابط فيديو MP4 للواجهة',poster:'رابط الصورة البديلة للواجهة',hint:'يُعرض MP4 دون صوت ويتكرر. تظهر الصورة عند تعطيل الحركة أو تعذر تشغيل الفيديو. استخدم مقطعًا قصيرًا مضغوطًا. يوتيوب رابط اختياري للمشاهدة.',error:'راجع البريد وروابط التواصل والفيديو والصورة البديلة ثم حاول مجددًا.'}
    : {mp4:'Hero MP4 URL',poster:'Hero poster image URL',hint:'MP4 plays muted and loops. Poster remains when motion is disabled or video fails. Use a short compressed clip. YouTube remains an optional showreel link.',error:'Check the email, social URLs and hero media URLs, then try again.'}; }
  private readonly http = inject(HttpClient); private readonly cdr = inject(ChangeDetectorRef);
  model: SiteSettings = this.empty(); loading = true; initialized = false; private loadInFlight = false; saving = false; error = ''; message = '';
  translationComplete(locale: 'en' | 'ar'): boolean {
    const name = locale === 'en' ? this.model.agencyNameEn : this.model.agencyNameAr;
    const description = locale === 'en' ? this.model.agencyDescriptionEn : this.model.agencyDescriptionAr;
    const address = locale === 'en' ? this.model.addressEn : this.model.addressAr;
    const alternateAddress = locale === 'en' ? this.model.addressAr : this.model.addressEn;
    return !!(name.trim() && description?.trim() && (!address?.trim() || !!alternateAddress?.trim()));
  }
  ngOnInit(): void { this.load(); }
  private empty(): SiteSettings { return { agencyNameEn: '', agencyNameAr: '', agencyDescriptionEn: '', agencyDescriptionAr: '', logoUrl: '', faviconUrl: '', email: '', phone: '', addressEn: '', addressAr: '', defaultSeoTitleEn: '', defaultSeoTitleAr: '', defaultSeoDescriptionEn: '', defaultSeoDescriptionAr: '', socialLinks: [], heroVideoUrl: '', heroMp4Url: '', heroPosterImageUrl: '' }; }
  get loadCopy() { return this.locale.locale() === 'ar'
    ? { loading: 'جارٍ تحميل الإعدادات الحالية…', error: 'تعذر تحميل الإعدادات الحالية. الحفظ غير متاح لحماية بيانات الموقع. حاول مجددًا.', retry: 'إعادة المحاولة' }
    : { loading: 'Loading existing settings…', error: 'Existing settings could not be loaded. Saving is unavailable to protect site data. Please retry.', retry: 'Retry' }; }
  get requiredNamesValid(): boolean { return !!(this.model.agencyNameEn.trim() && this.model.agencyNameAr.trim()); }
  load(): void {
    // Retry is only for failed initialization; never reload over an editable draft.
    if (this.loadInFlight || this.initialized || this.saving) return;
    this.loadInFlight = true; this.loading = true;
    this.http.get<SiteSettings>('/api/admin/settings').pipe(
      timeout(120_000),
      finalize(() => { this.loadInFlight = false; this.loading = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: item => {
        if (!item || typeof item.agencyNameEn !== 'string' || typeof item.agencyNameAr !== 'string' || !Array.isArray(item.socialLinks)) return;
        this.model = { ...item, socialLinks: item.socialLinks.map(link => ({ ...link })) };
        this.initialized = true; this.concurrency.open(()=>this.model,'/api/admin/settings',item.exists===false?undefined:'settings',item.version);
        this.error = '';
        this.cdr.markForCheck();
      },
      error: () => { this.initialized = false; this.cdr.markForCheck(); }
    });
  }
  addLink(): void { this.model.socialLinks.push({ platform: 'YouTube', url: '', displayOrder: this.model.socialLinks.length, isVisible: true }); }
  removeLink(index: number): void { this.model.socialLinks.splice(index, 1); }
  save(form?: NgForm): void { if(this.concurrency.blocked())return;
    if (!this.initialized || this.loading || this.saving) return;
    const errors=this.fieldValidation(); publishFieldErrors(this.root.nativeElement,errors);
    if (!this.requiredNamesValid || form?.invalid || Object.keys(errors).length) {form?.control.markAllAsTouched();return;}

    this.saving = true;
    this.error = '';
    this.message = '';
    this.http.put<SiteSettings>('/api/admin/settings', this.concurrency.payload(this.model)).pipe(
      timeout(120_000),
      finalize(() => { this.saving = false; this.loading = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: value => {
        this.model = { ...value, socialLinks: value.socialLinks.map(link => ({ ...link })) };
        this.saving = false;
        this.message = 'Settings saved.'; this.concurrency.open(()=>this.model,'/api/admin/settings','settings',value.version);
        this.cdr.markForCheck();
      },
      error: error => {
        if(this.concurrency.handle(error)){this.saving=false;return;}
        publishFieldErrors(this.root.nativeElement,error?.error?.errors ?? {});
        this.saving = false;
        this.error = error.status === 401
          ? 'Your admin session has expired. Sign in again, then retry saving.'
          : error.status === 400
            ? this.heroCopy.error
            : 'Could not save site settings.';
        this.cdr.markForCheck();
      }
    });
  }
}
