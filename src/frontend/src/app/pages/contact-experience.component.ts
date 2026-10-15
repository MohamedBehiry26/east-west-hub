import { Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { PublicSiteSettings } from '../core/public-content.models';
import en from '../../assets/i18n/en.json';
import ar from '../../assets/i18n/ar.json';

@Component({
  selector: 'ew-contact-experience', standalone: true, imports: [FormsModule],
  templateUrl: './contact-experience.component.html', styleUrl: './contact-experience.css'
})
export class ContactExperienceComponent {
  readonly locale = input<'ar' | 'en'>('en');
  readonly settings = input<PublicSiteSettings | null>(null);
  readonly loading = input(false);
  readonly loadError = input(false);
  readonly retry = output<void>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly copy = computed(() => (this.locale() === 'ar' ? ar : en).contactExperience);
  readonly services = computed(() => (this.locale() === 'ar' ? ar : en).publicContentPages.projectTypes);
  readonly company = computed(() => this.settings()?.agencyName?.trim() || 'East West Hub');
  readonly email = computed(() => {
    const value = this.settings()?.email?.trim() || '';
    return /^[^\s@<>?&#:%]+@[^\s@<>?&#:%]+\.[^\s@<>?&#:%]+$/.test(value) ? value : '';
  });
  readonly phone = computed(() => {
    const value = this.settings()?.phone?.trim() || '';
    return /^\+?[\d ()\-.]{6,30}$/.test(value) && value.replace(/\D/g, '').length >= 6 ? value : '';
  });
  readonly phoneLink = computed(() => 'tel:' + this.phone().replace(/[^+\d]/g, ''));
  readonly links = computed(() => (this.settings()?.socialLinks || []).filter(link => {
    try { const url = new URL(link.url); return !!link.platform.trim() && url.protocol === 'https:' && !url.username && !url.password; }
    catch { return false; }
  }));
  readonly whatsapp = computed(() => this.links().find(link => /^(wa\.me|api\.whatsapp\.com|www\.whatsapp\.com)$/i.test(new URL(link.url).hostname)));
  readonly social = computed(() => this.links().filter(link => link !== this.whatsapp()));
  readonly submitting = signal(false);
  readonly feedback = signal<'draft' | 'error' | null>(null);
  readonly draftUrl = signal('');
  name = ''; visitorEmail = ''; visitorPhone = ''; service = 'content-production'; details = '';
  readonly namePattern = '[\\s\\S]*\\S[\\s\\S]*';
  readonly phonePattern = '(?=(?:\\D*\\d){6})\\+?[0-9 ()\\-.]{6,30}';

  emailLink(): string {
    if (!this.email()) return '';
    const c = this.copy();
    const selected = this.services().find(option => option.value === this.service)?.label || '';
    const body = [`${c.service}: ${selected}`, `${c.name}: ${this.name.trim()}`, `${c.email}: ${this.visitorEmail.trim()}`,
      ...(this.visitorPhone.trim() ? [`${c.phone}: ${this.visitorPhone.trim()}`] : []), '', `${c.details}:`, this.details.trim()].join('\n');
    return `mailto:${this.email()}?subject=${encodeURIComponent('Project Inquiry - East West Hub')}&body=${encodeURIComponent(body)}`;
  }

  submit(form: NgForm): void {
    if (this.submitting() || this.feedback() === 'draft') return;
    this.feedback.set(null);
    if (this.name.trim().length < 2) form.controls['name']?.setErrors({ trimmedLength: true });
    if (this.details.trim().length < 10) form.controls['details']?.setErrors({ trimmedLength: true });
    if (!this.name.trim() || !this.details.trim() || form.invalid || !this.services().some(option => option.value === this.service)) {
      form.control.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('input.ng-invalid, select.ng-invalid, textarea.ng-invalid')?.focus();
      return;
    }
    if (!this.email() || this.loading() || this.loadError()) { this.feedback.set('error'); return; }
    this.submitting.set(true);
    this.draftUrl.set(this.emailLink());
    // This is an email-client handoff, not a delivered message or an API submission.
    try { this.openDraft(this.draftUrl()); this.feedback.set('draft'); }
    catch { this.feedback.set('error'); }
    finally { this.submitting.set(false); }
  }

  resetDraft(): void { this.feedback.set(null); this.draftUrl.set(''); }

  openDraft(url: string): void {
    const anchor = document.createElement('a');
    anchor.href = url; anchor.hidden = true;
    this.host.nativeElement.append(anchor);
    try { anchor.click(); } finally { anchor.remove(); }
  }
}
