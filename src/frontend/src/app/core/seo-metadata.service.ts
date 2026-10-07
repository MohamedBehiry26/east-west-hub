import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export type SiteLocale = 'en' | 'ar';

@Injectable({ providedIn: 'root' })
export class SeoMetadataService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  update(locale: SiteLocale, path: string, title: string, description: string, image?: string | null, alternatePath?: string, pageSchema?: Record<string, unknown> | null, indexable = true): void {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const origin = this.document.location?.origin ?? '';
    const canonical = `${origin}${normalizedPath}`;
    this.document.documentElement.lang = locale;
    this.document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: indexable ? 'index, follow' : 'noindex, follow' });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:locale', content: locale === 'ar' ? 'ar_EG' : 'en_US' });
    this.meta.updateTag({ property: 'og:locale:alternate', content: locale === 'ar' ? 'en_US' : 'ar_EG' });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:type', content: pageSchema?.['@type'] === 'Article' ? 'article' : 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'East West Hub' });
    this.meta.updateTag({ name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    if (image) this.meta.updateTag({ property: 'og:image', content: image });
    else this.meta.removeTag("property='og:image'");
    if (image) this.meta.updateTag({ name: 'twitter:image', content: image });
    else this.meta.removeTag("name='twitter:image'");

    this.setLink('canonical', null, canonical);
    const alternate = alternatePath?.startsWith('/') ? alternatePath : normalizedPath.replace(/^\/(en|ar)(?=\/|$)/, `/${locale === 'ar' ? 'en' : 'ar'}`);
    this.setLink('alternate', locale, canonical);
    this.setLink('alternate', locale === 'ar' ? 'en' : 'ar', `${origin}${alternate}`);
    this.setLink('alternate', 'x-default', `${origin}${locale === 'en' ? normalizedPath : alternate}`);

    const segments = normalizedPath.split('/').filter(Boolean);
    const home = `${origin}/${locale}`;
    const breadcrumbs = [{ '@type': 'ListItem', position: 1, name: locale === 'ar' ? 'الرئيسية' : 'Home', item: home }];
    if (segments.length > 1) breadcrumbs.push({ '@type': 'ListItem', position: 2, name: title.replace(/\s\|\sEast West Hub$/, ''), item: canonical });
    const schemas: Record<string, unknown>[] = [
      { '@context': 'https://schema.org', '@type': 'Organization', name: 'East West Hub', url: home },
      { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: breadcrumbs },
      ...(pageSchema ? [{ '@context': 'https://schema.org', ...pageSchema }] : [])
    ];
    this.setStructuredData(schemas);
  }

  private setStructuredData(schemas: Record<string, unknown>[]): void {
    const existing = this.document.head.querySelector('#east-west-hub-jsonld');
    existing?.remove();
    const script = this.document.createElement('script');
    script.id = 'east-west-hub-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schemas);
    this.document.head.appendChild(script);
  }

  private setLink(rel: string, hreflang: string | null, href: string): void {
    const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
    let element = this.document.head.querySelector<HTMLLinkElement>(selector);
    if (!element) { element = this.document.createElement('link'); element.rel = rel; if (hreflang) element.hreflang = hreflang; this.document.head.appendChild(element); }
    element.href = href;
  }
}
