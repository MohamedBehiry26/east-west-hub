import { TestBed } from '@angular/core/testing';
import { SeoMetadataService } from './seo-metadata.service';

describe('SEO locale metadata', () => {
  it('sets Arabic direction, canonical, and paired language alternates', () => {
    TestBed.configureTestingModule({});
    const seo = TestBed.inject(SeoMetadataService);
    seo.update('ar', '/ar/watch/media-story', 'قصة إعلامية', 'وصف عربي', null, '/en/watch/media-story');

    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(location.origin + '/ar/watch/media-story');
    expect(document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="en"]')?.href).toBe(location.origin + '/en/watch/media-story');
    expect(document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="ar"]')?.href).toBe(location.origin + '/ar/watch/media-story');
    expect(document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe('وصف عربي');
  });

  it('sets English direction and noindex metadata for not-found pages', () => {
    TestBed.configureTestingModule({});
    TestBed.inject(SeoMetadataService).update('en', '/en/404', '404', 'Not found', null, undefined, null, false);
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe('noindex, follow');
  });
});
