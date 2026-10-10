import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
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
  it('plays the configured hero only on activation and keeps its iframe stable', () => {
    setup('ar');
    const fixture = TestBed.createComponent(PublicHomePage); fixture.detectChanges();
    const component = fixture.componentInstance;
    component.siteSettings.set({agencyName:'Hub',agencyDescription:null,logoUrl:null,faviconUrl:null,email:null,phone:null,address:null,socialLinks:[],heroYouTubeVideoId:'M7lc1UVf-VE'});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-video-player')).toBeNull();
    fixture.nativeElement.querySelector('.hero-video-poster').click(); fixture.detectChanges();
    const iframe: HTMLIFrameElement = fixture.nativeElement.querySelector('.hero-video-player');
    expect(iframe.src).toContain('/embed/M7lc1UVf-VE');
    const setter = vi.spyOn(iframe,'src','set');
    window.dispatchEvent(new Event('scroll')); fixture.detectChanges();
    expect(setter).not.toHaveBeenCalled();
    component.siteSettings.set(null); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-video-player')).toBeNull();
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
    it(`renders ${locale} homepage without loading an iframe or background video`, () => {
      setup(locale);
      const fixture = TestBed.createComponent(PublicHomePage); fixture.detectChanges();
      const dom: HTMLElement = fixture.nativeElement;
      expect(dom.querySelector('h1')?.textContent).toContain(locale === 'ar' ? 'حكايات.' : 'Stories.');
      expect(dom.querySelectorAll('iframe, video').length).toBe(0);
      expect(dom.querySelector('.media-stack')).not.toBeNull();
      expect(dom.querySelector('.cinema-hero-shell > .cinema-hero.ew-container')).not.toBeNull();
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
    expect(fixture.nativeElement.querySelector('.hero-copy a')).not.toBeNull();
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

  it('keeps contact briefs as mailto with the configured address', () => {
    setup('ar','contact'); const fixture = TestBed.createComponent(PublicInfoPage); fixture.detectChanges();
    const href = fixture.nativeElement.querySelector('a[href^="mailto:"]')?.getAttribute('href');
    expect(href).toContain('mailto:qa@example.test?subject=');
    expect(decodeURIComponent(href)).toContain('نوع المشروع');
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

  it('keeps Arabic hero copy RTL while the desktop composition has a stable physical order', () => {
    setup('ar'); const fixture = TestBed.createComponent(PublicHomePage); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-composition .hero-copy')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.hero-composition .media-stage')).not.toBeNull();
  });
});
