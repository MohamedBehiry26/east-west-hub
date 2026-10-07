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
