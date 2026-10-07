import { Injectable, signal } from '@angular/core';
import en from '../../assets/i18n/en.json';
import ar from '../../assets/i18n/ar.json';

export type AdminLocale = 'en' | 'ar';

@Injectable({ providedIn: 'root' })
export class AdminLocaleService {
  readonly locale = signal<AdminLocale>(this.readSavedLocale());
  private readonly resources = { en, ar };

  text(key: string): string {
    const current = this.resources[this.locale()];
    const fallback = this.resources.en;
    if (key in current.admin) return current.admin[key as keyof typeof en.admin] ?? fallback.admin[key as keyof typeof en.admin];
    const uiKey = key as keyof typeof en.adminUi;
    return current.adminUi[uiKey] ?? fallback.adminUi[uiKey] ?? key;
  }

  format(key: string, values: Record<string, string | number>): string {
    return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), this.text(key));
  }

  set(locale: AdminLocale): void {
    this.locale.set(locale);
    try { localStorage.setItem('space-media-admin-locale', locale); } catch { /* Storage may be disabled. */ }
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }

  private readSavedLocale(): AdminLocale {
    try { return localStorage.getItem('space-media-admin-locale') === 'ar' ? 'ar' : 'en'; }
    catch { return 'en'; }
  }
}
