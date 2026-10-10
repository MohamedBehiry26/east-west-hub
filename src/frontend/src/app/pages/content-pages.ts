import { ContentBodyComponent } from '../shared/content-body.component';
import { MediaDepthDirective } from '../shared/media-depth.directive';
import { RevealDirective } from '../shared/reveal.directive';
import { ImageFallbackDirective } from '../shared/image-fallback.directive';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, distinctUntilChanged, map, Observable, of, Subscription, switchMap } from 'rxjs';
import { PublicContentApi } from '../core/public-content-api.service';
import { PublicArticle, PublicCategory, PublicPortfolioProject, PublicService, PublicSiteSettings, PublicVideo } from '../core/public-content.models';
import { AlternateRouteService } from '../core/alternate-route.service';
import { SeoMetadataService } from '../core/seo-metadata.service';
import enResources from '../../assets/i18n/en.json';
import arResources from '../../assets/i18n/ar.json';

type Locale = 'en' | 'ar';
type ContentKind = 'categories' | 'videos' | 'podcasts' | 'services' | 'portfolio' | 'articles';
interface ContentCard { playable?: boolean; publishedAt?: string | null; title: string; summary: string | null; imageUrl: string | null; href: string; eyebrow: string | null; }
interface DetailSection { title: string; body: string; }
interface ContentDetail { title: string; alternateSlug: string; seoTitle: string | null; seoDescription: string | null; summary: string | null; imageUrl: string | null; eyebrow: string | null; sections: DetailSection[]; videoId: string | null; episodeNumber?: number | null; relatedProjects: { title: string; href: string; imageUrl: string | null }[]; relatedVideos: { title: string; href: string; imageUrl: string | null }[]; tags: string[]; publishedAt: string | null; gallery: { imageUrl: string; altText: string | null }[]; showContactCta: boolean; }

const labels = { en: enResources.publicContentPages, ar: arResources.publicContentPages } as const;

@Component({
  standalone: true,
  imports: [RouterLink, FormsModule, MediaDepthDirective, RevealDirective, ImageFallbackDirective],
  templateUrl: './content-list.page.html'
})
export class ContentListPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PublicContentApi);
  private readonly seo = inject(SeoMetadataService);
  private readonly alternateRoute = inject(AlternateRouteService);
  readonly cards = signal<ContentCard[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly locale: Locale = this.route.parent?.snapshot.routeConfig?.path === 'ar' ? 'ar' : 'en';
  readonly kind = this.route.snapshot.data['kind'] as ContentKind;
  readonly section = (this.route.snapshot.data['section'] as string | undefined) ?? this.kind;
  readonly text = labels[this.locale];

  get pageCopy(): { title: string; intro: string; empty: string } {
    const resource = this.text as Record<string, unknown>;
    return (resource[this.section] ?? resource[this.kind]) as { title: string; intro: string; empty: string };
  }

  ngOnInit(): void {
    this.alternateRoute.set(null);
    this.seo.update(this.locale, `/${this.locale}/${this.section}`, `${this.pageCopy.title} | East West Hub`, this.pageCopy.intro);
    this.load();
  }

  readonly page = signal(1);
  readonly totalPages = signal(1);
  search = '';
  readonly waveform = [20,50,80,35,60,100,75,30,55,88,45,65,20,50,80,35,60,100,75,30,55,88,45,65];
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  get design() { return (this.locale === 'ar' ? arResources : enResources).publicDesign; }
  formatDate(value: string): string { return new Intl.DateTimeFormat(this.locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }).format(new Date(value)); }

  load(page = 1): void {
    this.request?.unsubscribe();
    this.page.set(page); this.loading.set(true); this.failed.set(false);
    const category = this.route.snapshot.queryParamMap.get('category') ?? undefined;
    const asPage = <T>(result: { items: T[]; totalCount: number; pageSize: number }, convert: (item: T) => ContentCard) => ({ cards: result.items.map(convert), totalPages: Math.max(1, Math.ceil(result.totalCount / result.pageSize)) });
    const request = this.kind === 'categories'
      ? this.api.getCategories(this.locale).pipe(map(items => ({ cards: items.map(item => this.categoryCard(item)), totalPages: 1 })))
      : this.kind === 'videos'
        ? this.api.getVideos(this.locale, category, { page, pageSize: 9 }).pipe(map(result => asPage(result, item => this.videoCard(item))))
        : this.kind === 'podcasts'
          ? this.api.getPodcasts(this.locale, { page, pageSize: 9, search: this.search.trim() || undefined }).pipe(map(result => asPage(result, item => this.videoCard(item))))
          : this.kind === 'services'
            ? this.api.getServices(this.locale, page, 12).pipe(map(result => asPage(result, item => this.serviceCard(item))))
            : this.kind === 'portfolio'
              ? this.api.getPortfolio(this.locale, page, 8).pipe(map(result => asPage(result, item => this.projectCard(item))))
              : this.api.getArticles(this.locale, page, 9).pipe(map(result => asPage(result, item => this.articleCard(item))));
    this.request = request.pipe(catchError(() => { this.failed.set(true); return of({ cards: [] as ContentCard[], totalPages: 1 }); }), takeUntilDestroyed(this.destroyRef))
      .subscribe(result => { this.cards.set(result.cards); this.totalPages.set(result.totalPages); this.loading.set(false); });
  }

  private categoryCard(item: PublicCategory): ContentCard { return { title: item.name, summary: item.description, imageUrl: item.imageUrl, href: `/${this.locale}/categories/${item.slug}`, eyebrow: null }; }
  private videoCard(item: PublicVideo): ContentCard { return { playable: !!item.youTubeVideoId, title: item.title, summary: item.description, imageUrl: item.thumbnailUrl, href: `/${this.locale}/${this.section}/${item.slug}`, eyebrow: [item.episodeNumber ? `${this.text.episode} ${new Intl.NumberFormat(this.locale).format(item.episodeNumber)}` : '', item.guestName, item.duration, item.category.name].filter(Boolean).join(' · ') }; }
  private serviceCard(item: PublicService): ContentCard { return { title: item.title, summary: item.shortDescription ?? item.description, imageUrl: item.imageUrl, href: `/${this.locale}/${this.section}/${item.slug}`, eyebrow: null }; }
  private projectCard(item: PublicPortfolioProject): ContentCard { return { title: item.title, summary: item.description, imageUrl: item.coverImageUrl, href: `/${this.locale}/${this.section}/${item.slug}`, eyebrow: item.category || (item.isFeatured ? this.text.featured : item.client) }; }
  private articleCard(item: PublicArticle): ContentCard { return { title: item.title, summary: item.excerpt, imageUrl: item.coverImageUrl, href: `/${this.locale}/${this.section}/${item.slug}`, eyebrow: item.authorName, publishedAt: item.publishedAt }; }
}

@Component({
  standalone: true,
  imports: [RouterLink, ContentBodyComponent, RevealDirective, ImageFallbackDirective],
  template: `
    <article ewReveal class="detail-page mx-auto" [attr.data-kind]="kind">
      <a [routerLink]="backUrl" class="text-sm text-[var(--ew-accent)] hover:text-white"><span class="directional-icon" aria-hidden="true">←</span> {{ text.back }}</a>
      @if (loading()) {
        <p class="py-20 text-center text-[#9a9a9a]" role="status">{{ text.loading }}</p>
      } @else if (failed()) {
        <div class="py-20 text-center" role="alert">
          <p class="text-rose-200">{{ notFound ? text.notFound : text.loadError }}</p>
          @if (!notFound) { <button type="button" (click)="load()" class="mt-5 rounded-full border border-white/20 px-5 py-2 text-sm">{{ text.retry }}</button> }
        </div>
      } @else if (detail(); as item) {
        @if (item.eyebrow) { <p class="mt-10 text-sm font-medium text-[var(--ew-accent)]">{{ item.eyebrow }}</p> }
        <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{{ item.title }}</h1>
        @if (item.summary) { <p class="mt-6 text-lg leading-8 text-slate-300">{{ item.summary }}</p> }
        @if (item.videoId) {
          <div class="detail-player mt-10 overflow-hidden bg-black">
            @if (embedStarted()) {
              <iframe [src]="videoEmbedSource()" [title]="text.videoTitle" class="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
            } @else {
              <button type="button" (click)="playVideo()" [attr.aria-label]="text.videoTitle" class="group relative block aspect-video w-full overflow-hidden bg-[#111111] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[var(--ew-accent)]">
                @if (item.imageUrl) { <img ewImage [src]="item.imageUrl" [alt]="''" width="1280" height="720" fetchpriority="high" decoding="async" class="absolute inset-0 size-full object-cover" /> }
                <span class="absolute inset-0 bg-black/20"></span><span aria-hidden="true" class="absolute inset-0 grid place-items-center"><span class="grid size-16 place-items-center rounded-full border border-white/50 bg-black/45 text-xl text-white backdrop-blur transition group-hover:scale-110 group-hover:bg-[var(--ew-accent)] group-hover:text-[#050505]">▶</span></span>
              </button>
            }
          </div>
          <div class="mt-4 flex flex-wrap items-center gap-4"><a [href]="'https://www.youtube.com/watch?v=' + item.videoId" target="_blank" rel="noopener noreferrer" class="inline-flex text-sm text-[var(--ew-accent)] hover:text-white">{{ text.videoTitle }} <span class="directional-icon" aria-hidden="true">↗</span></a><button type="button" (click)="shareVideo()" class="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 hover:border-[var(--ew-accent)]/50">{{ text.share }}</button>@if (shareMessage()) { <span role="status" class="text-xs text-[var(--ew-accent)]">{{ shareMessage() }}</span> }</div>
          @if (item.publishedAt) { <p class="mt-4 text-sm text-[#9a9a9a]"><time [attr.datetime]="item.publishedAt">{{ formatPublishedDate(item.publishedAt) }}</time></p> }
          @if (item.tags.length) { <div class="mt-4 flex flex-wrap gap-2">@for (tag of item.tags; track tag) {<span class="rounded-full border border-white/10 px-3 py-1 text-xs text-[#9a9a9a]">{{ tag }}</span>}</div> }
        } @else if (item.imageUrl) {
          <img ewImage [src]="item.imageUrl" [alt]="item.title" width="1280" height="720" fetchpriority="high" decoding="async" class="mt-10 aspect-video max-h-[520px] w-full rounded-sm border border-white/10 object-cover" />
        }
        @if (!item.videoId && (kind === 'videos' || kind === 'podcasts')) {<p class="mt-4 text-sm text-[#9a9a9a]">{{ design.posterOnly }}</p>}
        @if (!item.videoId && item.publishedAt) {<p class="mt-5 text-sm text-[#9a9a9a]"><time [attr.datetime]="item.publishedAt">{{ formatPublishedDate(item.publishedAt) }}</time></p>}
        <div class="detail-sections mt-10 space-y-8">
          @for (section of item.sections; track section.title) {
            <section>
              <h2 class="text-xl font-semibold">{{ section.title }}</h2>
              <ew-content-body [body]="section.body" />
            </section>
          }
        </div>
        @if (item.relatedProjects.length) {
          <section class="mt-14 border-t border-white/10 pt-8"><h2 class="text-xl font-semibold">{{ text.relatedProjects }}</h2><div class="mt-5 grid gap-4 sm:grid-cols-2">
            @for (project of item.relatedProjects; track project.href) {
              <a [routerLink]="project.href" class="group overflow-hidden rounded-sm border border-white/10 bg-white/[.03]">
                @if (project.imageUrl) { <img ewImage decoding="async" [src]="project.imageUrl" [alt]="project.title" loading="lazy" class="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.02]" /> }
                <span class="block p-4 text-sm font-medium group-hover:text-[var(--ew-accent)]">{{ project.title }} <span class="directional-icon" aria-hidden="true">↗</span></span>
              </a>
            }
          </div></section>
        }
        @if (item.relatedVideos.length) { <section class="mt-14 border-t border-white/10 pt-8"><h2 class="text-xl font-semibold">{{ text.relatedVideos }}</h2><div class="mt-5 grid gap-4 sm:grid-cols-3">@for (video of item.relatedVideos; track video.href) {<a [routerLink]="video.href" class="content-card group overflow-hidden">@if (video.imageUrl) {<img ewImage decoding="async" [src]="video.imageUrl" [alt]="video.title" loading="lazy" class="aspect-video w-full object-cover transition duration-500 group-hover:scale-105" />}<span class="block p-4 text-sm font-medium group-hover:text-[var(--ew-accent)]">{{ video.title }}</span></a>}</div></section> }
        @if (item.gallery.length) {
          <section class="mt-14 border-t border-white/10 pt-8"><h2 class="text-xl font-semibold">{{ text.results }}</h2><div class="mt-5 grid gap-4 sm:grid-cols-2">
            @for (image of item.gallery; track image.imageUrl) { <img ewImage [src]="image.imageUrl" [alt]="image.altText || item.title" width="800" height="600" loading="lazy" decoding="async" class="aspect-[4/3] w-full rounded-sm border border-white/10 object-cover" /> }
          </div></section>
        }
        @if (item.showContactCta) { <a [routerLink]="'/' + locale + '/contact'" class="mt-12 inline-flex rounded-full bg-[var(--ew-accent)] px-6 py-3 text-sm font-semibold text-[#050505] transition hover:bg-white">{{ text.serviceCta }} <span class="directional-icon" aria-hidden="true">↗</span></a> }
      }
    </article>
  `
})
export class ContentDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(PublicContentApi);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly seo = inject(SeoMetadataService);
  private readonly alternateRoute = inject(AlternateRouteService);
  locale: Locale = this.route.parent?.snapshot.routeConfig?.path === 'ar' ? 'ar' : 'en';
  readonly kind = this.route.snapshot.data['kind'] as Exclude<ContentKind, 'categories'>;
  readonly section = (this.route.snapshot.data['section'] as string | undefined) ?? this.kind;
  get text() { return labels[this.locale]; }
  readonly detail = signal<ContentDetail | null>(null);
  readonly embedStarted = signal(false);
  readonly videoEmbedSource = computed(() => {
    const id = this.detail()?.videoId;
    return id ? this.videoEmbedUrl(id) : null;
  });
  readonly loading = signal(true);
  readonly failed = signal(false);
  notFound = false;
  readonly shareMessage = signal('');
  get design() { return (this.locale === 'ar' ? arResources : enResources).publicDesign; }
  private detailLoad?: Subscription;

  get backUrl(): string { return `/${this.locale}/${this.section}`; }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map((params) => params.get('slug')),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((slug) => this.load(slug));
  }

  videoEmbedUrl(id: string): SafeResourceUrl | null {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube-nocookie.com/embed/${id}`);
  }

  playVideo(): void { this.embedStarted.set(true); }

  load(slug: string | null = this.route.snapshot.paramMap.get('slug')): void {
    this.locale = this.router.url.startsWith('/ar/') || this.router.url === '/ar' ? 'ar' : 'en';
    this.detailLoad?.unsubscribe();
    this.loading.set(true); this.failed.set(false); this.notFound = false; this.embedStarted.set(false); this.detail.set(null);
    if (!slug) { this.failed.set(true); this.loading.set(false); this.notFound = true; return; }
    const request = this.kind === 'videos' ? this.loadVideoDetail(slug)
      : this.kind === 'podcasts' ? this.loadPodcastDetail(slug)
      : this.kind === 'services' ? this.api.getService(this.locale, slug).pipe(map((item) => this.serviceDetail(item)))
        : this.kind === 'portfolio' ? this.api.getPortfolioProject(this.locale, slug).pipe(map((item) => this.projectDetail(item)))
          : this.api.getArticle(this.locale, slug).pipe(map((item) => this.articleDetail(item)));

    this.detailLoad = request.pipe(catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 404) this.notFound = true;
      this.failed.set(true);
      return of(null);
    }), takeUntilDestroyed(this.destroyRef)).subscribe((detail) => {
      this.detail.set(detail);
      this.loading.set(false);
      if (detail) {
        const title = (detail.seoTitle || detail.title).replace(/(?:\s*\|\s*East West Hub)+$/i, '').trim();
        const description = detail.seoDescription || detail.summary || '';
        const path = `/${this.locale}/${this.section}/${encodeURIComponent(slug)}`;
        const alternate = `/${this.locale === 'ar' ? 'en' : 'ar'}/${this.section}/${detail.alternateSlug || slug}`;
        this.alternateRoute.set(alternate);
        const pageSchema = this.kind === 'videos' && detail.videoId ? {
          '@type': 'VideoObject', name: detail.title, description,
          ...(detail.imageUrl ? { thumbnailUrl: [detail.imageUrl] } : {}),
          ...(detail.publishedAt ? { uploadDate: detail.publishedAt } : {}),
          embedUrl: `https://www.youtube-nocookie.com/embed/${detail.videoId}`,
          contentUrl: `https://www.youtube.com/watch?v=${detail.videoId}`
        } : this.kind === 'podcasts' ? {
          '@type': 'PodcastEpisode', name: detail.title, description,
          ...(detail.episodeNumber ? { episodeNumber: detail.episodeNumber } : {}),
          partOfSeries: { '@type': 'PodcastSeries', name: this.locale === 'ar' ? 'بودكاست إيست ويست هب' : 'East West Hub Podcasts' }
        } : this.kind === 'articles' ? {
          '@type': 'Article', headline: detail.title, description,
          ...(detail.imageUrl ? { image: [detail.imageUrl] } : {}),
          ...(detail.publishedAt ? { datePublished: detail.publishedAt } : {}),
          author: { '@type': 'Organization', name: 'East West Hub' }, publisher: { '@type': 'Organization', name: 'East West Hub' }
        } : null;
        this.seo.update(this.locale, path, `${title} | East West Hub`, description, detail.imageUrl, alternate, pageSchema);
      } else {
        this.seo.update(this.locale, `/${this.locale}/${this.section}/${encodeURIComponent(slug)}`, `${this.notFound ? this.text.notFound : this.text.loadError} | East West Hub`, '', null, undefined, null, false);
      }
    });
  }

  async shareVideo(): Promise<void> {
    const item = this.detail(); if (!item || !item.videoId) return;
    const url = `https://www.youtube.com/watch?v=${item.videoId}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, url });
      else { await navigator.clipboard.writeText(url); this.shareMessage.set(this.text.copied); }
    } catch { /* Sharing was dismissed or clipboard access was unavailable. */ }
  }
  private loadVideoDetail(slug: string): Observable<ContentDetail> {
    return this.api.getVideo(this.locale, slug).pipe(switchMap(item => this.api.getVideos(this.locale, undefined, { pageSize: 12, order: 'latest' }).pipe(
      map(page => page.items.filter(video => video.id !== item.id).slice(0, 3)),
      catchError(() => of([] as PublicVideo[])),
      map(related => this.videoDetail(item, related))
    )));
  }
  private loadPodcastDetail(slug: string): Observable<ContentDetail> {
    return this.api.getPodcast(this.locale, slug).pipe(switchMap(item => this.api.getPodcasts(this.locale, { pageSize: 12 }).pipe(
      map(page => page.items.filter(podcast => podcast.id !== item.id).slice(0, 3)),
      catchError(() => of([] as PublicVideo[])),
      map(related => this.videoDetail(item, related))
    )));
  }
  formatPublishedDate(value: string): string { return new Intl.DateTimeFormat(this.locale === 'ar' ? 'ar-EG-u-ca-gregory' : 'en-US', { dateStyle: 'medium' }).format(new Date(value)); }
  private videoDetail(item: PublicVideo, related: PublicVideo[] = []): ContentDetail { return { title: item.title, alternateSlug: item.alternateSlug, seoTitle: item.seoTitle, seoDescription: item.seoDescription, summary: item.description, imageUrl: item.thumbnailUrl, eyebrow: item.category.name, sections: item.contentType === 'podcast' ? [{ title: this.text.podcastDetails, body: [item.episodeNumber ? `${this.text.episode} ${item.episodeNumber}` : '', item.seasonNumber ? `${this.text.season} ${item.seasonNumber}` : '', item.guestName ? `${this.text.guest}: ${item.guestName}` : ''].filter(Boolean).join(' · ') }].filter(section => section.body) : [], videoId: item.youTubeVideoId, episodeNumber: item.episodeNumber, relatedProjects: [], relatedVideos: related.map(video => ({ title: video.title, href: `/${this.locale}/${this.section}/${video.slug}`, imageUrl: video.thumbnailUrl })), tags: item.tags ?? [], publishedAt: item.publishedAt, gallery: [], showContactCta: false }; }
  private serviceDetail(item: PublicService): ContentDetail {
    const sections: { title: string; body: string }[] = [];
    if (item.description) sections.push({ title: item.title, body: item.description });
    if (item.features) sections.push({ title: this.text.capabilities, body: item.features });
    if (item.process) sections.push({ title: this.text.process, body: item.process });
    return { title: item.title, alternateSlug: item.alternateSlug, seoTitle: item.seoTitle, seoDescription: item.seoDescription, summary: item.shortDescription, imageUrl: item.imageUrl, eyebrow: null, sections, videoId: null, relatedVideos: [], tags: [], publishedAt: null,
      relatedProjects: item.relatedProjects.map(project => ({ title: project.title, href: `/${this.locale}/projects/${project.slug}`, imageUrl: project.coverImageUrl })), gallery: [], showContactCta: true };
  }
  private projectDetail(item: PublicPortfolioProject): ContentDetail {
    const sections: DetailSection[] = [];
    if (item.challenge) sections.push({ title: this.text.challenge, body: item.challenge });
    if (item.approach) sections.push({ title: this.text.approach, body: item.approach });
    if (item.solution) sections.push({ title: this.text.solution, body: item.solution });
    if (item.results) sections.push({ title: this.text.results, body: item.results });
    if (item.servicesUsed.length) sections.push({ title: this.text.servicesUsed, body: item.servicesUsed.join('\n') });
    return { title: item.title, alternateSlug: item.alternateSlug, seoTitle: item.seoTitle, seoDescription: item.seoDescription, summary: item.description, imageUrl: item.coverImageUrl, eyebrow: item.category || item.client, sections, videoId: null, relatedProjects: [], relatedVideos: [], tags: [], publishedAt: null, gallery: item.images.map(image => ({ imageUrl: image.imageUrl, altText: image.altText })), showContactCta: true };
  }
  private articleDetail(item: PublicArticle): ContentDetail { return { title: item.title, alternateSlug: item.alternateSlug, seoTitle: item.seoTitle, seoDescription: item.seoDescription, summary: item.excerpt, imageUrl: item.coverImageUrl, eyebrow: `${this.text.by} ${item.authorName}`, sections: item.content ? [{ title: item.title, body: item.content }] : [], videoId: null, relatedProjects: [], relatedVideos: [], tags: [], publishedAt: item.publishedAt, gallery: [], showContactCta: false }; }
}

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, RevealDirective, ImageFallbackDirective],
  template: `
    <div class="info-page-shell" [attr.data-kind]="kind">
    <section ewReveal class="info-page mx-auto" [attr.data-kind]="kind">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ew-accent)]">EAST WEST HUB</p>
      <h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{{ kind === 'about' ? text.aboutTitle : text.contactTitle }}</h1>
      <p class="mt-6 max-w-3xl text-lg leading-8 text-slate-300">{{ kind === 'about' ? (settings()?.agencyDescription || text.aboutBody) : text.contactBody }}</p>

      @if (kind === 'about') {<div class="info-visual"><figure><img ewImage src="/assets/demo/east-west-studio.svg" [alt]="design.productionVisualAlt" width="1200" height="1400" loading="lazy" /></figure><div><h2>{{ design.processTitle }}</h2><p class="mt-5 leading-8 text-[#9a9a9a]">{{ design.processIntro }}</p><ol class="process-list">@for (step of design.processSteps; track step) {<li>{{ step }}</li>}</ol><a [routerLink]="'/' + locale + '/services'" class="ew-link mt-5">{{ text.capabilities }} <span class="directional-icon" aria-hidden="true">↗</span></a></div></div>}
      @if (kind === 'contact') {
        <div class="contact-form">
          <label class="block text-sm text-slate-300">{{ text.projectType }}
            <select [(ngModel)]="projectType" name="projectType" class="mt-2 w-full rounded-sm border border-white/15 bg-[#111111] px-4 py-3 text-white">
              @for (option of text.projectTypes; track option.value) { <option [value]="option.value">{{ option.label }}</option> }
            </select>
          </label>
          @if (settings()?.email; as email) { <a [href]="projectEmailLink(email)" class="mt-4 inline-flex rounded-full bg-[var(--ew-accent)] px-5 py-3 text-sm font-semibold text-[#050505]">{{ text.sendProjectBrief }} <span class="directional-icon" aria-hidden="true">↗</span></a> }
        </div>
        @if (settings(); as site) {
          <div class="contact-details mt-10 grid gap-4 sm:grid-cols-2">
            @if (site.email) { <a [href]="'mailto:' + site.email" class="rounded-sm border border-white/10 bg-white/[0.03] p-6 hover:border-[var(--ew-accent)]/40"><span class="block text-xs text-[#9a9a9a]">{{ text.contactEmail }}</span><span class="mt-2 block break-all font-medium">{{ site.email }}</span></a> }
            @if (site.phone) { <a [href]="'tel:' + site.phone" class="rounded-sm border border-white/10 bg-white/[0.03] p-6 hover:border-[var(--ew-accent)]/40"><span class="block text-xs text-[#9a9a9a]">{{ text.phone }}</span><span class="mt-2 block font-medium">{{ site.phone }}</span></a> }
            @if (site.address) { <div class="rounded-sm border border-white/10 bg-white/[0.03] p-6"><span class="block text-xs text-[#9a9a9a]">{{ text.address }}</span><span class="mt-2 block font-medium">{{ site.address }}</span></div> }
            @for (link of site.socialLinks; track link.platform) { <a [href]="link.url" target="_blank" rel="noopener noreferrer" class="rounded-sm border border-white/10 bg-white/[0.03] p-6 hover:border-[var(--ew-accent)]/40"><span class="block text-xs text-[#9a9a9a]">{{ text.social }}</span><span class="mt-2 block font-medium">{{ link.platform }} <span class="directional-icon" aria-hidden="true">↗</span></span></a> }
          </div>
        } @else {
          <p class="mt-10 rounded-sm border border-white/10 bg-white/[0.03] p-6 text-[#9a9a9a]">{{ text.noContact }}</p>
        }
      }
    </section>
    </div>
  `
})
export class PublicInfoPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PublicContentApi);
  private readonly seo = inject(SeoMetadataService);
  readonly locale: Locale = this.route.parent?.snapshot.routeConfig?.path === 'ar' ? 'ar' : 'en';
  readonly kind = this.route.snapshot.data['kind'] as 'about' | 'contact';
  readonly text = labels[this.locale];
  readonly settings = signal<PublicSiteSettings | null>(null);
  projectType = 'content-production';
  get design() { return (this.locale === 'ar' ? arResources : enResources).publicDesign; }

  projectEmailLink(email: string): string {
    const option = this.text.projectTypes.find(item => item.value === this.projectType);
    const subject = this.locale === 'ar' ? 'استفسار عن مشروع — ' : 'Project enquiry — ';
    const body = this.locale === 'ar' ? 'نوع المشروع: ' : 'Project type: ';
    return `mailto:${email}?subject=${encodeURIComponent(subject + (option?.label ?? ''))}&body=${encodeURIComponent(body + (option?.label ?? ''))}`;
  }

  ngOnInit(): void {
    const title = this.kind === 'about' ? this.text.aboutTitle : this.text.contactTitle;
    this.seo.update(this.locale, `/${this.locale}/${this.kind}`, `${title} | East West Hub`, this.kind === 'about' ? this.text.aboutBody : this.text.contactBody);
    this.api.getSiteSettings(this.locale).pipe(catchError(() => of(null)))
      .subscribe((settings) => this.settings.set(settings));
  }
}
