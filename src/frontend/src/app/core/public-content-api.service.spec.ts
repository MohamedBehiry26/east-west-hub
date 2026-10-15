import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PublicContentApi } from './public-content-api.service';

describe('public content API', () => {
  let api: PublicContentApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(PublicContentApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());
  it('refetches articles in both locales after an initially empty listing', () => {
    for (const lang of ['ar','en']) {
      api.getArticles(lang).subscribe();http.expectOne(req => req.url.endsWith('/articles')).flush({items:[],totalCount:0});
      let count=0;api.getArticles(lang).subscribe(page => count=page.totalCount);
      const request=http.expectOne(req => req.url.endsWith('/articles'));expect(request.request.params.get('lang')).toBe(lang);request.flush({items:[{id:'published'}],totalCount:1});expect(count).toBe(1);
    }
  });

  it('sends localized search and pagination parameters and reuses cached results', () => {
    let firstTotal = -1;
    let secondTotal = -1;
    const query = { page: 2, pageSize: 9, search: 'حملة' };
    api.getVideos('ar', undefined, query).subscribe((page) => firstTotal = page.totalCount);
    const request = http.expectOne((req) => req.url.endsWith('/videos'));
    expect(request.request.params.get('lang')).toBe('ar');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('9');
    expect(request.request.params.get('search')).toBe('حملة');
    request.flush({ items: [], page: 2, pageSize: 9, totalCount: 0 });

    api.getVideos('ar', undefined, query).subscribe((page) => secondTotal = page.totalCount);
    http.expectNone((req) => req.url.endsWith('/videos'));
    expect(firstTotal).toBe(0);
    expect(secondTotal).toBe(0);
  });

  it('uses YouTube artwork for linked videos and preserves unlinked posters', () => {
    let images: (string | null)[] = [];
    api.getVideos('ar').subscribe(page => images = page.items.map(video => video.thumbnailUrl));
    http.expectOne(req => req.url.endsWith('/videos')).flush({
      items: [
        { youTubeVideoId: 'HjOdg4Mvp-s', thumbnailUrl: 'https://broken.example.test' },
        { youTubeVideoId: null, thumbnailUrl: '/assets/demo/media/camera.svg' }
      ], page: 1, pageSize: 24, totalCount: 2
    });
    expect(images).toEqual(['https://i.ytimg.com/vi/HjOdg4Mvp-s/hqdefault.jpg', '/assets/demo/media/camera.svg']);
  });

  it('uses YouTube artwork for podcast details with no saved image', () => {
    let image: string | null = null;
    api.getPodcast('ar', 'episode').subscribe(video => image = video.thumbnailUrl);
    http.expectOne(req => req.url.endsWith('/podcasts/episode')).flush({ youTubeVideoId: 'M7lc1UVf-VE', thumbnailUrl: null });
    expect(image).toBe('https://i.ytimg.com/vi/M7lc1UVf-VE/hqdefault.jpg');
  });

  it('requests podcast episodes from the localized podcast endpoint', () => {
    api.getPodcasts('ar', { page: 2, pageSize: 6, search: 'حوار' }).subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/podcasts'));
    expect(request.request.params.get('lang')).toBe('ar');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('6');
    expect(request.request.params.get('search')).toBe('حوار');
    request.flush({ items: [], page: 2, pageSize: 6, totalCount: 0 });
  });
});
