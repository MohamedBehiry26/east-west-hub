import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, timeout } from 'rxjs';
import { AdminTextPipe } from '../core/admin-text.pipe';

interface SocialLink { platform: string; url: string; displayOrder: number; isVisible: boolean; }
interface SiteSettings {
  heroVideoUrl?: string | null;
  agencyNameEn: string; agencyNameAr: string; agencyDescriptionEn: string | null; agencyDescriptionAr: string | null;
  logoUrl: string | null; faviconUrl: string | null; email: string | null; phone: string | null;
  addressEn: string | null; addressAr: string | null;
  defaultSeoTitleEn: string | null; defaultSeoTitleAr: string | null; defaultSeoDescriptionEn: string | null; defaultSeoDescriptionAr: string | null; socialLinks: SocialLink[];
}
const field = 'mt-1 w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4a077]';

@Component({
  standalone: true, imports: [CommonModule, FormsModule, AdminTextPipe],
  template: `
    <section class="space-y-7">
      <header><p class="text-xs font-semibold uppercase tracking-[.22em] text-[#d4a077]">{{ 'Site configuration' | adminText }}</p><h1 class="mt-2 text-3xl font-semibold">{{ 'Settings' | adminText }}</h1><p class="mt-2 text-sm text-[#a0a0a0]">{{ 'Update public agency details and social links in both languages.' | adminText }}</p></header>
      <div class="flex flex-wrap gap-3 text-xs"><span class="rounded-full border border-white/10 px-3 py-2" [class.text-emerald-200]="translationComplete('en')" [class.text-amber-200]="!translationComplete('en')">English {{ (translationComplete('en') ? 'translation.completeSettings' : 'translation.missingSettings') | adminText }}</span><span class="rounded-full border border-white/10 px-3 py-2" [class.text-emerald-200]="translationComplete('ar')" [class.text-amber-200]="!translationComplete('ar')">Arabic {{ (translationComplete('ar') ? 'translation.completeSettings' : 'translation.missingSettings') | adminText }}</span></div>
      <p *ngIf="message" role="status" class="rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">{{message | adminText}}</p>
      <p *ngIf="error" role="alert" class="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">{{error | adminText}}</p>
      <form (ngSubmit)="save()" class="space-y-6 rounded-2xl border border-white/10 bg-[#141414]/[.03] p-5 sm:p-7">
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
        <div class="grid gap-4 sm:grid-cols-2"><label class="block text-xs text-[#a0a0a0]">{{ 'Contact email' | adminText }}<input class="${field}" type="email" maxlength="320" [(ngModel)]="model.email" name="email"></label><label class="block text-xs text-[#a0a0a0]">{{ 'Phone' | adminText }}<input class="${field}" type="tel" maxlength="40" [(ngModel)]="model.phone" name="phone"></label><label class="block text-xs text-[#a0a0a0]">{{ 'Logo image URL' | adminText }}<input class="${field}" type="url" maxlength="2048" [(ngModel)]="model.logoUrl" name="logo"></label><label class="block text-xs text-[#a0a0a0]">{{ 'Favicon URL' | adminText }}<input class="${field}" type="url" maxlength="2048" [(ngModel)]="model.faviconUrl" name="favicon"></label></div>

        <section class="space-y-3 rounded-xl border border-[#d4a077]/25 p-4"><h2 class="font-semibold">{{'Homepage hero video' | adminText}}</h2><label class="block text-xs text-[#a0a0a0]">{{'YouTube video URL' | adminText}}<input class="${field}" type="url" maxlength="2048" [(ngModel)]="model.heroVideoUrl" name="heroVideoUrl" placeholder="https://www.youtube.com/watch?v=…" dir="ltr"></label><p class="text-xs leading-6 text-[#a0a0a0]">{{'Paste a YouTube link for the homepage hero. Clear it to restore the default image. Featured videos are managed in Media.' | adminText}}</p></section>
        <section class="space-y-4 rounded-xl border border-white/10 p-4"><h2 class="font-semibold">{{'Default SEO metadata' | adminText}}</h2><div class="grid gap-4 md:grid-cols-2"><fieldset class="space-y-3"><legend class="text-sm text-[#a0a0a0]">English</legend><label class="block text-xs text-[#a0a0a0]">{{'SEO title' | adminText}}<input class="${field}" maxlength="250" [(ngModel)]="model.defaultSeoTitleEn" name="defaultSeoTitleEn"></label><label class="block text-xs text-[#a0a0a0]">{{'SEO description' | adminText}}<textarea class="${field}" maxlength="500" rows="3" [(ngModel)]="model.defaultSeoDescriptionEn" name="defaultSeoDescriptionEn"></textarea></label></fieldset><fieldset class="space-y-3" dir="rtl"><legend class="text-sm text-[#a0a0a0]">العربية</legend><label class="block text-xs text-[#a0a0a0]">عنوان SEO<input class="${field}" maxlength="250" [(ngModel)]="model.defaultSeoTitleAr" name="defaultSeoTitleAr"></label><label class="block text-xs text-[#a0a0a0]">وصف SEO<textarea class="${field}" maxlength="500" rows="3" [(ngModel)]="model.defaultSeoDescriptionAr" name="defaultSeoDescriptionAr"></textarea></label></fieldset></div></section>
        <fieldset class="space-y-3 rounded-xl border border-white/10 p-4"><div class="flex items-center justify-between"><legend class="text-sm font-semibold">{{ 'Social links' | adminText }}</legend><button type="button" (click)="addLink()" class="rounded-lg border border-[#d4a077]/30 px-3 py-2 text-xs text-[#d4a077]">{{ 'Add link' | adminText }}</button></div>
          <div *ngFor="let link of model.socialLinks; let i=index" class="grid gap-2 rounded-lg bg-black/20 p-3 sm:grid-cols-[.8fr_1.8fr_90px_auto_auto]"><select class="${field}" [(ngModel)]="link.platform" [name]="'platform'+i"><option value="YouTube">YouTube</option><option value="Instagram">Instagram</option><option value="LinkedIn">LinkedIn</option><option value="Facebook">Facebook</option><option value="X">X</option><option value="TikTok">TikTok</option></select><input class="${field}" type="url" required placeholder="https://…" [(ngModel)]="link.url" [name]="'url'+i"><input class="${field}" type="number" [title]="'Display order' | adminText" [(ngModel)]="link.displayOrder" [name]="'order'+i"><label class="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" [(ngModel)]="link.isVisible" [name]="'visible'+i">{{ 'Visible' | adminText }}</label><button type="button" (click)="removeLink(i)" class="cms-action cms-action--delete"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7" /></svg>{{ 'Remove' | adminText }}</button></div>
          <p *ngIf="!model.socialLinks.length" class="text-xs text-[#a0a0a0]">{{ 'No social links configured.' | adminText }}</p>
        </fieldset>
        <div class="flex justify-end"><button type="submit" [disabled]="saving" class="rounded-xl bg-[#d4a077] px-5 py-2.5 text-sm font-semibold text-[#17120e]">{{ (saving ? 'Saving…' : 'Save settings') | adminText }}</button></div>
      </form>
    </section>`
})
export class AdminSettingsPage implements OnInit {
  private readonly http = inject(HttpClient); private readonly cdr = inject(ChangeDetectorRef);
  model: SiteSettings = this.empty(); loading = true; saving = false; error = ''; message = '';
  translationComplete(locale: 'en' | 'ar'): boolean {
    const name = locale === 'en' ? this.model.agencyNameEn : this.model.agencyNameAr;
    const description = locale === 'en' ? this.model.agencyDescriptionEn : this.model.agencyDescriptionAr;
    const address = locale === 'en' ? this.model.addressEn : this.model.addressAr;
    const alternateAddress = locale === 'en' ? this.model.addressAr : this.model.addressEn;
    return !!(name.trim() && description?.trim() && (!address?.trim() || !!alternateAddress?.trim()));
  }
  ngOnInit(): void { this.load(); }
  private empty(): SiteSettings { return { agencyNameEn: '', agencyNameAr: '', agencyDescriptionEn: '', agencyDescriptionAr: '', logoUrl: '', faviconUrl: '', email: '', phone: '', addressEn: '', addressAr: '', defaultSeoTitleEn: '', defaultSeoTitleAr: '', defaultSeoDescriptionEn: '', defaultSeoDescriptionAr: '', socialLinks: [], heroVideoUrl: '' }; }
  load(): void { this.loading = true; this.http.get<SiteSettings>('/api/admin/settings').pipe(timeout(120_000), finalize(() => { this.loading = false; this.cdr.markForCheck(); })).subscribe({ next: item => { this.model = { ...item, socialLinks: item.socialLinks.map(link => ({ ...link })) }; this.loading = false; this.cdr.markForCheck(); }, error: () => { this.error = 'Could not load site settings.'; this.loading = false; this.cdr.markForCheck(); } }); }
  addLink(): void { this.model.socialLinks.push({ platform: 'YouTube', url: '', displayOrder: this.model.socialLinks.length, isVisible: true }); }
  removeLink(index: number): void { this.model.socialLinks.splice(index, 1); }
  save(): void {
    if (this.saving) return;

    this.saving = true;
    this.error = '';
    this.message = '';
    this.http.put<SiteSettings>('/api/admin/settings', this.model).pipe(
      timeout(120_000),
      finalize(() => { this.saving = false; this.loading = false; this.cdr.markForCheck(); })
    ).subscribe({
      next: value => {
        this.model = { ...value, socialLinks: value.socialLinks.map(link => ({ ...link })) };
        this.saving = false;
        this.message = 'Settings saved.';
        this.cdr.markForCheck();
      },
      error: error => {
        this.saving = false;
        this.error = error.status === 401
          ? 'Your admin session has expired. Sign in again, then retry saving.'
          : error.status === 400
            ? 'Check the email, social URLs and YouTube hero link, then try again.'
            : 'Could not save site settings.';
        this.cdr.markForCheck();
      }
    });
  }
}
