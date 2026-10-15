import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';
import {
  PublicArticle, PublicCategory, PublicPage, PublicPortfolioProject,
  PublicService, PublicSiteSettings, PublicTag, PublicVideo
} from './public-content.models';

@Injectable({ providedIn: 'root' })
export class PublicContentApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/v1/public`;
  private readonly cache = new Map<string, { expiresAt: number; stream: Observable<unknown> }>();

  private cached<T>(key: string, request: () => Observable<T>): Observable<T> {
    const now = Date.now();
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > now) return existing.stream as Observable<T>;
    if (existing) this.cache.delete(key);
    for (const [cacheKey, entry] of this.cache) if (entry.expiresAt <= now) this.cache.delete(cacheKey);
    if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value!);
    let entry: { expiresAt: number; stream: Observable<unknown> };
    const stream = request().pipe(
      catchError(error => {
        if (this.cache.get(key) === entry) this.cache.delete(key);
        return throwError(() => error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    entry = { expiresAt: now + 60_000, stream };
    this.cache.set(key, entry);
    return stream;
  }

  private videoThumbnail(video: PublicVideo): PublicVideo {
    return video.youTubeVideoId && /^[A-Za-z0-9_-]{11}$/.test(video.youTubeVideoId)
      ? { ...video, thumbnailUrl: `https://i.ytimg.com/vi/${video.youTubeVideoId}/hqdefault.jpg` }
      : video;
  }

  getSiteSettings(lang: string) {
    return this.cached(`site:${lang}`, () => this.http.get<PublicSiteSettings>(`${this.baseUrl}/site`, { params: { lang } }));
  }

  getCategories(lang: string) {
    return this.cached(`categories:${lang}`, () => this.http.get<PublicCategory[]>(`${this.baseUrl}/categories`, { params: { lang } }));
  }

  getVideos(lang: string, category?: string, options: { page?: number; pageSize?: number; search?: string; tag?: string; featured?: boolean; order?: string } = {}) {
    let params = new HttpParams().set('lang', lang).set('page', options.page ?? 1).set('pageSize', options.pageSize ?? 24).set('order', options.order ?? 'featured');
    if (category) params = params.set('category', category);
    if (options.search) params = params.set('search', options.search);
    if (options.tag) params = params.set('tag', options.tag);
    if (options.featured !== undefined) params = params.set('featured', options.featured);
    return this.cached(`videos:${params.toString()}`, () => this.http.get<PublicPage<PublicVideo>>(`${this.baseUrl}/videos`, { params }).pipe(map(page => ({ ...page, items: page.items.map(video => this.videoThumbnail(video)) }))));
  }

  getTags(lang: string) { return this.cached(`tags:${lang}`, () => this.http.get<PublicTag[]>(`${this.baseUrl}/tags`, { params: { lang } })); }

  getVideo(lang: string, slug: string) {
    return this.cached(`video:${lang}:${slug}`, () => this.http.get<PublicVideo>(`${this.baseUrl}/videos/${encodeURIComponent(slug)}`, { params: { lang } }).pipe(map(video => this.videoThumbnail(video))));
  }

  getPodcasts(lang: string, options: { page?: number; pageSize?: number; search?: string } = {}) {
    let params = new HttpParams().set('lang', lang).set('page', options.page ?? 1).set('pageSize', options.pageSize ?? 24);
    if (options.search) params = params.set('search', options.search);
    return this.cached(`podcasts:${params.toString()}`, () => this.http.get<PublicPage<PublicVideo>>(`${this.baseUrl}/podcasts`, { params }).pipe(map(page => ({ ...page, items: page.items.map(video => this.videoThumbnail(video)) }))));
  }

  getPodcast(lang: string, slug: string) {
    return this.cached(`podcast:${lang}:${slug}`, () => this.http.get<PublicVideo>(`${this.baseUrl}/podcasts/${encodeURIComponent(slug)}`, { params: { lang } }).pipe(map(video => this.videoThumbnail(video))));
  }

  getServices(lang: string, page = 1, pageSize = 50) {
    return this.cached(`services:${lang}:${page}:${pageSize}`, () => this.http.get<PublicPage<PublicService>>(`${this.baseUrl}/services`, { params: { lang, page, pageSize } }));
  }

  getService(lang: string, slug: string) {
    return this.cached(`service:${lang}:${slug}`, () => this.http.get<PublicService>(`${this.baseUrl}/services/${encodeURIComponent(slug)}`, { params: { lang } }));
  }

  getPortfolio(lang: string, page = 1, pageSize = 50) {
    return this.cached(`portfolio:${lang}:${page}:${pageSize}`, () => this.http.get<PublicPage<PublicPortfolioProject>>(`${this.baseUrl}/portfolio`, { params: { lang, page, pageSize } }));
  }

  getPortfolioProject(lang: string, slug: string) {
    return this.cached(`project:${lang}:${slug}`, () => this.http.get<PublicPortfolioProject>(`${this.baseUrl}/portfolio/${encodeURIComponent(slug)}`, { params: { lang } }));
  }

  getArticles(lang: string, page = 1, pageSize = 50) {
    return this.http.get<PublicPage<PublicArticle>>(`${this.baseUrl}/articles`, { params: { lang, page, pageSize } });
  }

  getArticle(lang: string, slug: string) {
    return this.http.get<PublicArticle>(`${this.baseUrl}/articles/${encodeURIComponent(slug)}`, { params: { lang } });
  }
}
