import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { PublicContentApi } from '../core/public-content-api.service';
import { SeoMetadataService } from '../core/seo-metadata.service';
import { AlternateRouteService } from '../core/alternate-route.service';
import { PublicHomePage } from './public-home.page';
import { PublicLayoutComponent } from './public-layout.component';
import { ContentListPage, PublicInfoPage } from './content-pages';
import { VideoListPage } from './public-utility-pages';
import { PublicVideo } from '../core/public-content.models';
import { routes } from '../app.routes';
import en from '../../assets/i18n/en.json';
import ar from '../../assets/i18n/ar.json';

const category = { id: 'c', slug: 'production', alternateSlug: 'intaj', name: 'Production', description: null, imageUrl: null, displayOrder: 0 };
const video: PublicVideo = { id: 'v', slug: 'story', alternateSlug: 'hikaya', title: 'A production story', description: 'A fictional QA sample', thumbnailUrl: null, youTubeVideoId: 'M7lc1UVf-VE', publishedAt: '2026-09-10T10:00:00Z', duration: '04:10', isFeatured: true, category, tags: [], contentType: 'podcast', episodeNumber: 2, seasonNumber: 1, guestName: 'QA guest', seoTitle: null, seoDescription: null };
const page = { items: [video], page: 1, pageSize: 9, totalCount: 20 };
const empty = { items: [], page: 1, pageSize: 9, totalCount: 0 };
function setup(locale: 'en' | 'ar' = 'en', kind = 'podcasts') {
  const api = {
    getVideos: vi.fn(() => of(page)), getPodcasts: vi.fn(() => of(page)),
    getCategories: vi.fn(() => of([category])), getTags: vi.fn(() => of([])),
    getServices: vi.fn(() => of(empty)), getPortfolio: vi.fn(() => of(empty)), getArticles: vi.fn(() => of(empty)),
    getSiteSettings: vi.fn(() => of({ agencyName: 'East West Hub', agencyDescription: null, logoUrl: null, faviconUrl: null, email: 'qa@example.test', phone: null, address: null, socialLinks: [] }))
  };
  const alternate = { set: vi.fn(), url: vi.fn(() => null as string | null) };
  TestBed.configureTestingModule({ providers: [provideRouter([]),
    { provide: PublicContentApi, useValue: api },
    { provide: SeoMetadataService, useValue: { update: vi.fn() } },
    { provide: AlternateRouteService, useValue: alternate },
    { provide: ActivatedRoute, useValue: { snapshot: { routeConfig: { path: locale }, data: { kind }, queryParamMap: convertToParamMap({}) }, parent: { snapshot: { routeConfig: { path: locale } } } } }
  ] });
  return { api, alternate };
}

describe('cinematic public experience', () => {
  it('preserves YouTube as a showreel link without embedding its branded player', () => {
    setup('ar'); const fixture=TestBed.createComponent(PublicHomePage);fixture.detectChanges();
    fixture.componentInstance.siteSettings.set({agencyName:'Hub',agencyDescription:null,logoUrl:null,faviconUrl:null,email:null,phone:null,address:null,socialLinks:[],heroYouTubeVideoId:'M7lc1UVf-VE'});fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ew-cinematic-hero a[href*="youtube.com/watch"]')?.getAttribute('href')).toContain('M7lc1UVf-VE');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });
  it('debounces watch search and resets pagination while keeping filters', async () => {
    vi.useFakeTimers();
    try {
      const { api } = setup('ar');
      const fixture = TestBed.createComponent(VideoListPage); fixture.detectChanges();
      const c = fixture.componentInstance;
      c.category = 'production'; c.tag = 'creative'; c.load(2);
      api.getVideos.mockClear();
      c.searchChanged('ح'); c.searchChanged('حملة');
      await vi.advanceTimersByTimeAsync(299);
      expect(api.getVideos).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(api.getVideos).toHaveBeenCalledTimes(1);
      expect(api.getVideos).toHaveBeenLastCalledWith('ar', 'production', expect.objectContaining({ page: 1, search: 'حملة', tag: 'creative' }));
      c.searchChanged('pending'); c.clearSearch();
      expect(api.getVideos).toHaveBeenLastCalledWith('ar', 'production', expect.objectContaining({ page: 1, search: undefined }));
      const calls = api.getVideos.mock.calls.length;
      await vi.advanceTimersByTimeAsync(500);
      expect(api.getVideos.mock.calls.length).toBe(calls);
      fixture.destroy();
    } finally { vi.useRealTimers(); }
  });

  afterEach(() => { document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; });

  for (const locale of ['en', 'ar'] as const) {
    it(`renders a valid ${locale} language link with separate compatible query parameters`, () => {
      setup(locale);
      vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue(`/${locale}/search?q=film&category=invalid`);
      const fixture = TestBed.createComponent(PublicLayoutComponent); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.locale-link').getAttribute('href')).toBe(`/${locale === 'en' ? 'ar' : 'en'}/search?q=film`);
      fixture.destroy();
    });
    it(`distinguishes every secondary failure from empty ${locale} homepage content`, () => {
      const { api } = setup(locale);
      api.getVideos.mockReturnValueOnce(of(page)).mockReturnValueOnce(throwError(() => new Error('offline')));
      for (const method of [api.getPodcasts, api.getCategories, api.getServices, api.getPortfolio, api.getArticles]) method.mockReturnValueOnce(throwError(() => new Error('offline')));
      const fixture = TestBed.createComponent(PublicHomePage); fixture.detectChanges();
      expect(fixture.componentInstance.featuredVideo()?.id).toBe('v');
      expect(fixture.nativeElement.querySelectorAll('[data-section-error]').length).toBe(6);
      expect(fixture.nativeElement.querySelector('.podcast-empty')).toBeNull();
      expect(fixture.nativeElement.querySelector('.empty-line')).toBeNull();
      expect(fixture.nativeElement.querySelector('[data-section-error="services"]').textContent).toContain((locale === 'ar' ? ar : en).publicDesign.loadError);
      fixture.destroy();
    });
    it(`retries only the failed ${locale} section and retains successful sections`, () => {
      const { api } = setup(locale);
      api.getServices.mockReturnValueOnce(throwError(() => new Error('offline')));
      const fixture = TestBed.createComponent(PublicHomePage); fixture.detectChanges();
      const featured = fixture.componentInstance.featuredVideo();
      const podcast = fixture.componentInstance.featuredPodcast();
      fixture.nativeElement.querySelector('[data-section-error="services"] button').click(); fixture.detectChanges();
      expect(api.getServices).toHaveBeenCalledTimes(2);
      expect(api.getPortfolio).toHaveBeenCalledTimes(1);
      expect(api.getPodcasts).toHaveBeenCalledTimes(1);
      expect(api.getSiteSettings).toHaveBeenCalledTimes(1);
      expect(fixture.componentInstance.featuredVideo()).toBe(featured);
      expect(fixture.componentInstance.featuredPodcast()).toBe(podcast);
      expect(fixture.nativeElement.querySelector('[data-section-error="services"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('.empty-line')).not.toBeNull();
      fixture.destroy();
    });
  }
  it('prevents duplicate retries and recovers loading state on retry failure', () => {
    const { api } = setup(); const pending = new Subject<typeof empty>();
    api.getServices.mockReturnValueOnce(throwError(() => new Error('offline'))).mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(PublicHomePage); fixture.detectChanges();
    fixture.componentInstance.retrySection('services'); fixture.componentInstance.retrySection('services');
    expect(api.getServices).toHaveBeenCalledTimes(2);
    pending.error(new Error('still offline')); fixture.detectChanges();
    expect(fixture.componentInstance.sectionPending('services')).toBe(false);
    expect(fixture.componentInstance.sectionFailed('services')).toBe(true);
    fixture.componentInstance.retrySection('services'); fixture.detectChanges();
    expect(api.getServices).toHaveBeenCalledTimes(3);
    expect(fixture.componentInstance.sectionFailed('services')).toBe(false);
    fixture.destroy();
  });

  for (const locale of ['en', 'ar'] as const) {
    it(`renders ${locale} homepage without embedding a YouTube iframe`, () => {
      setup(locale);
      const fixture = TestBed.createComponent(PublicHomePage); fixture.detectChanges();
      const dom: HTMLElement = fixture.nativeElement;
      expect(dom.querySelector('h1')?.textContent).toContain(locale === 'ar' ? 'نحوّل الأفكار' : 'We Turn Ideas');
      expect(dom.querySelectorAll('iframe').length).toBe(0);
      expect(dom.querySelector('.media-stack')).toBeNull();
      expect(dom.querySelector('.ewh-cinema')).not.toBeNull();
      expect(dom.querySelector('.stage-bottom')).toBeNull();
      expect(dom.querySelectorAll('main').length).toBe(0);
      expect(document.documentElement.dir).toBe(locale === 'ar' ? 'rtl' : 'ltr');
      expect(dom.querySelector('a[href*="/watch/story"]')).not.toBeNull();
      expect(dom.querySelector('.category-strip a')?.getAttribute('href')).toContain(`/${locale}/categories/production`);
    });

    it(`keeps ${locale} menu, footer contact and entity language switching usable`, () => {
      const { alternate } = setup(locale);
      alternate.url.mockReturnValue(locale === 'en' ? '/ar/watch/hikaya' : '/en/watch/story');
      const fixture = TestBed.createComponent(PublicLayoutComponent); fixture.detectChanges();
      const dom: HTMLElement = fixture.nativeElement;
      expect(dom.querySelector('.public-site')?.getAttribute('dir')).toBe(locale === 'ar' ? 'rtl' : 'ltr');
      expect(dom.querySelector('.locale-link')?.getAttribute('href')).toContain(locale === 'en' ? '/ar/watch/hikaya' : '/en/watch/story');
      expect(dom.querySelector('.footer-contact a')?.getAttribute('href')).toBe('mailto:qa@example.test');
      expect(dom.querySelector('.site-footer > .ew-container')).not.toBeNull();
      expect(dom.querySelector('.brand-symbol')?.textContent).toBe('e↔w');
      expect(dom.querySelector('.footer-wordmark')?.textContent).toBe('EAST WESTHUB.');
      expect(dom.querySelector('.brand-lockup img, .site-footer img')).toBeNull();
      const toggle = dom.querySelector<HTMLButtonElement>('.menu-toggle')!;
      toggle.click(); fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(dom.querySelectorAll('#mobile-navigation a').length).toBe(8);
      dom.querySelector('header')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(dom.querySelector('.skip-link')).not.toBeNull();
    });
  }

  it('shows retry on a homepage media error and remains navigable', () => {
    const { api } = setup(); api.getVideos.mockReturnValue(throwError(() => new Error('offline')));
    const fixture = TestBed.createComponent(PublicHomePage); fixture.detectChanges();
    expect(fixture.componentInstance.failed()).toBe(true);
    expect(fixture.nativeElement.querySelector('.empty-feature button')?.textContent).toContain('Try again');
    expect(fixture.nativeElement.querySelector('.ewh-cinema__actions a')).not.toBeNull();
  });

  it('loads Watch with working search, category, tag, ordering and pagination', () => {
    const { api } = setup('en', 'videos');
    const fixture = TestBed.createComponent(VideoListPage); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.search = '  edit  '; component.category = 'production'; component.tag = 'studio'; component.order = 'latest'; component.featured = true;
    component.load(2); fixture.detectChanges();
    expect(api.getVideos).toHaveBeenLastCalledWith('en', 'production', { page: 2, pageSize: 9, search: 'edit', tag: 'studio', order: 'latest', featured: true });
    expect(component.totalPages()).toBe(3);
    expect(fixture.nativeElement.querySelector('[data-kind="videos"] .page-hero--watch')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.media-play')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('ignores stale Watch responses after a newer filter request', () => {
    const { api } = setup('en', 'videos');
    const old = new Subject<typeof page>(); const recent = new Subject<typeof page>();
    api.getVideos.mockReturnValueOnce(old).mockReturnValueOnce(recent);
    const fixture = TestBed.createComponent(VideoListPage); fixture.detectChanges();
    fixture.componentInstance.load(2);
    recent.next({ ...page, items: [{ ...video, title: 'Current' }] });
    old.next({ ...page, items: [{ ...video, title: 'Stale' }] });
    expect(fixture.componentInstance.videos()[0].title).toBe('Current');
  });

  it('renders podcast metadata, search and pagination through the existing API', () => {
    const { api } = setup('ar');
    const fixture = TestBed.createComponent(ContentListPage); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-kind="podcasts"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('QA guest');
    fixture.componentInstance.search = '  حوار  '; fixture.componentInstance.load(2);
    expect(api.getPodcasts).toHaveBeenLastCalledWith('ar', { page: 2, pageSize: 9, search: 'حوار' });
    expect(fixture.componentInstance.totalPages()).toBe(3);
  });

  for (const locale of ['ar','en'] as const) it(`opens a ${locale} project email draft with selected service and preserves contact links`, () => {
    setup(locale,'contact'); const fixture = TestBed.createComponent(PublicInfoPage); fixture.detectChanges();
    const component=fixture.componentInstance;
    component.settings.set({agencyName:'East West Hub',agencyDescription:null,logoUrl:null,faviconUrl:null,email:'qa@example.test',phone:'+201000000000',address:null,socialLinks:[{platform:'Instagram',url:'https://instagram.com/example'}]});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.inquiry-form')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.company-rows a[href="mailto:qa@example.test"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="tel:+201000000000"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="https://instagram.com/example"]')?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(fixture.nativeElement.querySelector('ew-project-inquiry-form')).toBeNull();
    expect(fixture.nativeElement.querySelector('.info-page-shell[data-kind="contact"]')).not.toBeNull();
  });

  for (const kind of ['services', 'portfolio', 'articles', 'categories']) {
    it(`keeps ${kind} empty states and editorial layouts renderable`, () => {
      setup('en', kind);
      const fixture = TestBed.createComponent(ContentListPage); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-kind]')?.getAttribute('data-kind')).toBe(kind);
      expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.page-hero')).not.toBeNull();
      expect(fixture.componentInstance.loading()).toBe(false);
      expect(fixture.componentInstance.failed()).toBe(false);
    });
  }

  it('keeps the Arabic hero scroll link on the Arabic homepage', () => {
    setup('ar'); const fixture = TestBed.createComponent(PublicHomePage); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.scroll-cue')?.getAttribute('href')).toBe('/ar#selected-media');
  });

  it('resolves Watch to the full library in both languages', async () => {
    for (const locale of ['en','ar']) {
      const watch = routes.find(route => route.path === locale)!.children!.find(route => route.path === 'watch')!;
      expect(await (watch.loadComponent as () => Promise<unknown>)()).toBe(VideoListPage);
    }
  });

  it('has matching bilingual design resource keys and no empty labels', () => {
    expect(Object.keys(en.publicDesign).sort()).toEqual(Object.keys(ar.publicDesign).sort());
    expect(Object.values(en.publicDesign).every(Boolean)).toBe(true);
    expect(Object.values(ar.publicDesign).every(Boolean)).toBe(true);
  });

  it('keeps Arabic cinematic copy and actions in RTL', () => {
    setup('ar'); const fixture = TestBed.createComponent(PublicHomePage); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ewh-cinema')?.getAttribute('dir')).toBe('rtl');
    expect(fixture.nativeElement.querySelector('.ewh-cinema__actions a')?.getAttribute('href')).toBe('/ar/projects');
  });
});
