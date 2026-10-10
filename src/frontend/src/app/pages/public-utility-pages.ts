import { RevealDirective } from '../shared/reveal.directive';
import { ImageFallbackDirective } from '../shared/image-fallback.directive';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, distinctUntilChanged, expand, forkJoin, map, of, reduce, Subscription, timer } from 'rxjs';
import { PublicContentApi } from '../core/public-content-api.service';
import enResources from '../../assets/i18n/en.json';
import arResources from '../../assets/i18n/ar.json';
type PublicUiKey = keyof typeof enResources.publicUtility;
type PublicMetaKey = keyof typeof enResources.publicMeta;
import { PublicArticle, PublicCategory, PublicPage, PublicPortfolioProject, PublicService, PublicTag, PublicVideo } from '../core/public-content.models';
import { SeoMetadataService } from '../core/seo-metadata.service';
import { AlternateRouteService } from '../core/alternate-route.service';

type Locale = 'en' | 'ar';
interface SearchResult { title: string; summary: string | null; image: string | null; href: string; type: string; searchText: string; }

function loadEveryPage<T>(load: (page: number) => Observable<PublicPage<T>>): Observable<T[]> {
  return load(1).pipe(
    expand(result => result.page * result.pageSize < result.totalCount ? load(result.page + 1) : of()),
    reduce((items, result) => items.concat(result.items), [] as T[])
  );
}

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, RevealDirective, ImageFallbackDirective],
  template: `
    <section ewReveal class="public-collection" data-kind="videos">
      <header class="page-hero page-hero--watch"><p class="eyebrow">{{ t('text0') }}</p>
      <h1 class="section-title">{{ t('text1') }}</h1><p class="page-hero-copy">{{ metaText('videoDescription') }}</p></header>
      <div class="filter-bar mt-8 grid gap-3 md:grid-cols-[minmax(0,1fr)_200px_190px_170px]">
        <form class="watch-search" (ngSubmit)="load(1)" role="search"><label class="watch-search-input"><span class="sr-only">{{ t('text2') }}</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input [ngModel]="search" (ngModelChange)="searchChanged($event)" name="videoSearch" type="search" [placeholder]="t('text3')" />@if (search) {<button class="watch-search-clear" type="button" (click)="clearSearch()" [attr.aria-label]="t('clearSearch')">×</button>}</label><button type="submit" class="watch-search-submit">{{ t('text12') }}</button></form>
        <label class="rounded-sm border border-white/15 bg-white/[.04] px-4 py-3"><span class="sr-only">{{ t('text4') }}</span><select [(ngModel)]="category" (ngModelChange)="load(1)" class="w-full bg-transparent text-slate-200 outline-none"><option value="" class="bg-[#111111]">{{ t('text5') }}</option>@for (item of categories(); track item.id) { <option [value]="item.slug" class="bg-[#111111]">{{ item.name }}</option> }</select></label>
        <label class="rounded-sm border border-white/15 bg-white/[.04] px-4 py-3"><span class="sr-only">{{ t('text6') }}</span><select [(ngModel)]="tag" (ngModelChange)="load(1)" class="w-full bg-transparent text-slate-200 outline-none"><option value="" class="bg-[#111111]">{{ t('text7') }}</option>@for (item of tags(); track item.slug) { <option [value]="item.slug" class="bg-[#111111]">{{ item.name }}</option> }</select></label>
        <label class="rounded-sm border border-white/15 bg-white/[.04] px-4 py-3"><span class="sr-only">{{ t('text8') }}</span><select [(ngModel)]="order" (ngModelChange)="load(1)" class="w-full bg-transparent text-slate-200 outline-none"><option value="featured" class="bg-[#111111]">{{ t('text9') }}</option><option value="latest" class="bg-[#111111]">{{ t('text10') }}</option><option value="oldest" class="bg-[#111111]">{{ t('text11') }}</option></select></label>
      </div>
      
      <label class="mt-4 inline-flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" [(ngModel)]="featured" (ngModelChange)="load(1)" />{{ t('text13') }}</label>
      @if (loading()) { <div class="mt-10 grid gap-5 sm:grid-cols-2" role="status"><span class="sr-only">{{ t('text14') }}</span><div class="media-skeleton" aria-hidden="true"></div><div class="media-skeleton" aria-hidden="true"></div></div> }
      @else if (error()) { <p role="alert" class="py-16 text-center text-rose-200">{{ t('text15') }} <button type="button" (click)="load(page())" class="underline">{{ t('text16') }}</button></p> }
      @else if (!videos().length) { <p class="mt-10 rounded-sm border border-white/10 bg-white/[.025] p-10 text-center text-[#9a9a9a]">{{ t('text17') }}</p> }
      @else {
        <div class="library-grid mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">@for (video of videos(); track video.id) {
          <a [routerLink]="'/' + locale + '/watch/' + video.slug" class="content-card group overflow-hidden">
            <div class="relative aspect-video overflow-hidden bg-[#111111]">@if (video.thumbnailUrl) {<img ewImage decoding="async" [src]="video.thumbnailUrl" [alt]="video.title" loading="lazy" class="size-full object-cover transition duration-500 group-hover:scale-105" />}<span class="absolute bottom-3 end-3 rounded-full bg-black/70 px-3 py-1 text-xs">{{ video.category.name }} @if (video.duration) { · {{ video.duration }} }</span>@if (video.youTubeVideoId) {<span class="media-play small" aria-hidden="true">▶</span>}</div>
            <div class="p-5"><p class="eyebrow mb-2">{{ contentTypeLabel(video.contentType) }}</p><h2 class="text-lg font-semibold group-hover:text-[var(--ew-accent)]">{{ video.title }}</h2><p class="mt-2 line-clamp-2 text-sm leading-6 text-[#9a9a9a]">{{ video.description }}</p><div class="mt-3 flex flex-wrap gap-2">@for (name of video.tags; track name) {<span class="rounded-full border border-white/10 px-2 py-1 text-[10px] text-[#9a9a9a]">{{ name }}</span>}</div></div>
          </a>
        }</div>
        <nav class="mt-10 flex items-center justify-center gap-5" [attr.aria-label]="t('text18')"><button type="button" [disabled]="page() <= 1" (click)="load(page()-1)" class="rounded-full border border-white/15 px-4 py-2 text-sm disabled:opacity-40">{{ t('text19') }}</button><span class="text-sm text-[#9a9a9a]">{{ page() }} / {{ totalPages() }}</span><button type="button" [disabled]="page() >= totalPages()" (click)="load(page()+1)" class="rounded-full border border-white/15 px-4 py-2 text-sm disabled:opacity-40">{{ t('text20') }}</button></nav>
      }
    </section>
  `
})
export class VideoListPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PublicContentApi);
  private readonly seo = inject(SeoMetadataService);
  readonly locale: Locale = this.route.parent?.snapshot.routeConfig?.path === 'ar' ? 'ar' : 'en';
  t(key: PublicUiKey): string { return this.locale === 'ar' ? arResources.publicUtility[key] : enResources.publicUtility[key]; }
  metaText(key: PublicMetaKey): string { return this.locale === 'ar' ? arResources.publicMeta[key] : enResources.publicMeta[key]; }
  readonly videos = signal<PublicVideo[]>([]);
  readonly categories = signal<PublicCategory[]>([]);
  readonly tags = signal<PublicTag[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private searchDelay?: Subscription;
  searchChanged(value: string): void {
    this.search = value;
    this.searchDelay?.unsubscribe();
    this.request?.unsubscribe();
    this.loading.set(true);
    this.searchDelay = timer(300).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load(1));
  }
  clearSearch(): void { this.search = ''; this.load(1); }
  contentTypeLabel(value: string): string { const names = (this.locale === 'ar' ? arResources : enResources).adminUi as Record<string,string>; return names[value] ?? names['video']; }
  search = ''; category = ''; tag = ''; order = 'featured'; featured = false;
  ngOnInit(): void {
    document.documentElement.lang = this.locale; document.documentElement.dir = this.locale === 'ar' ? 'rtl' : 'ltr';
    this.seo.update(this.locale, `/${this.locale}/watch`, `${this.metaText('videoTitle')} | East West Hub`, this.metaText('videoDescription'));
    this.category = this.route.snapshot.queryParamMap.get('category') ?? '';
    this.api.getCategories(this.locale).pipe(catchError(() => of([] as PublicCategory[]))).subscribe(items => this.categories.set(items));
    this.api.getTags(this.locale).pipe(catchError(() => of([] as PublicTag[]))).subscribe(items => this.tags.set(items));
    this.load(1);
  }
  load(page: number): void {
    this.searchDelay?.unsubscribe();
    this.request?.unsubscribe();
    this.page.set(page); this.loading.set(true); this.error.set(false);
    this.request = this.api.getVideos(this.locale, this.category || undefined, { page, pageSize: 9, search: this.search.trim() || undefined, tag: this.tag || undefined, featured: this.featured ? true : undefined, order: this.order })
      .pipe(catchError(() => { this.error.set(true); return of({ items: [] as PublicVideo[], page, pageSize: 9, totalCount: 0 }); }), takeUntilDestroyed(this.destroyRef))
      .subscribe(result => { this.videos.set(result.items); this.page.set(result.page); this.totalPages.set(Math.max(1, Math.ceil(result.totalCount / result.pageSize))); this.loading.set(false); });
  }
}

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, RevealDirective, ImageFallbackDirective],
  template: `
    <section ewReveal class="public-collection">
      <p class="eyebrow">{{ t('text21') }}</p>
      <h1 class="section-title">{{ t('text22') }}</h1>
      <label class="mt-8 flex max-w-3xl items-center gap-3 rounded-sm border border-white/15 bg-white/[.04] px-5 py-4 focus-within:border-[var(--ew-accent)]/60">
        <span aria-hidden="true" class="text-xl text-[var(--ew-accent)]">⌕</span>
        <input [ngModel]="query()" (ngModelChange)="query.set($event)" type="search" class="w-full bg-transparent text-base outline-none placeholder:text-[#9a9a9a]" [placeholder]="t('text23')" [attr.aria-label]="t('text24')" />
      </label>
      @if (loading()) { <p class="py-16 text-[#9a9a9a]" role="status">{{ t('text25') }}</p> }
      @else if (query().trim() && results().length === 0) { <p class="py-16 text-[#9a9a9a]">{{ t('text26') }}</p> }
      @else if (!query().trim()) { <p class="py-10 text-sm text-[#9a9a9a]">{{ t('text27') }}</p> }
      @else {
        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (result of results(); track result.href) {
            <a [routerLink]="result.href" class="content-card group overflow-hidden">
              @if (result.image) { <img ewImage decoding="async" [src]="result.image" [alt]="result.title" loading="lazy" class="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> }
              <div class="p-5"><p class="text-xs font-medium text-[var(--ew-accent)]">{{ result.type }}</p><h2 class="mt-2 text-lg font-semibold group-hover:text-[var(--ew-accent)]">{{ result.title }}</h2>@if (result.summary) {<p class="mt-2 line-clamp-2 text-sm leading-6 text-[#9a9a9a]">{{ result.summary }}</p>}</div>
            </a>
          }
        </div>
      }
    </section>
  `
})
export class SearchPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PublicContentApi);
  private readonly seo = inject(SeoMetadataService);
  readonly locale: Locale = this.route.parent?.snapshot.routeConfig?.path === 'ar' ? 'ar' : 'en';
  t(key: PublicUiKey): string { return this.locale === 'ar' ? arResources.publicUtility[key] : enResources.publicUtility[key]; }
  metaText(key: PublicMetaKey): string { return this.locale === 'ar' ? arResources.publicMeta[key] : enResources.publicMeta[key]; }
  readonly query = signal('');
  readonly loading = signal(true);
  private readonly data = signal<SearchResult[]>([]);
  readonly results = computed(() => {
    const term = this.query().trim().toLocaleLowerCase(this.locale);
    if (!term) return [];
    return this.data().filter((item) => `${item.searchText} ${item.type}`.toLocaleLowerCase(this.locale).includes(term));
  });

  ngOnInit(): void {
    document.documentElement.lang = this.locale;
    document.documentElement.dir = this.locale === 'ar' ? 'rtl' : 'ltr';
    this.seo.update(this.locale, `/${this.locale}/search`, `${this.metaText('searchTitle')} | East West Hub`, this.metaText('searchDescription'));
    const other: Locale = this.locale === 'ar' ? 'en' : 'ar';
    forkJoin({
      categories: this.api.getCategories(this.locale).pipe(catchError(() => of([] as PublicCategory[]))),
      videos: loadEveryPage(page => this.api.getVideos(this.locale, undefined, { page, pageSize: 50 })).pipe(catchError(() => of([] as PublicVideo[]))),
      podcasts: loadEveryPage(page => this.api.getPodcasts(this.locale, { page, pageSize: 50 })).pipe(catchError(() => of([] as PublicVideo[]))),
      services: loadEveryPage(page => this.api.getServices(this.locale, page)).pipe(catchError(() => of([] as PublicService[]))),
      projects: loadEveryPage(page => this.api.getPortfolio(this.locale, page)).pipe(catchError(() => of([] as PublicPortfolioProject[]))),
      articles: loadEveryPage(page => this.api.getArticles(this.locale, page)).pipe(catchError(() => of([] as PublicArticle[]))),
      otherCategories: this.api.getCategories(other).pipe(catchError(() => of([] as PublicCategory[]))),
      otherVideos: loadEveryPage(page => this.api.getVideos(other, undefined, { page, pageSize: 50 })).pipe(catchError(() => of([] as PublicVideo[]))),
      otherPodcasts: loadEveryPage(page => this.api.getPodcasts(other, { page, pageSize: 50 })).pipe(catchError(() => of([] as PublicVideo[]))),
      otherServices: loadEveryPage(page => this.api.getServices(other, page)).pipe(catchError(() => of([] as PublicService[]))),
      otherProjects: loadEveryPage(page => this.api.getPortfolio(other, page)).pipe(catchError(() => of([] as PublicPortfolioProject[]))),
      otherArticles: loadEveryPage(page => this.api.getArticles(other, page)).pipe(catchError(() => of([] as PublicArticle[])))
    }).pipe(map(({ categories, videos, podcasts, services, projects, articles, otherCategories, otherVideos, otherPodcasts, otherServices, otherProjects, otherArticles }): SearchResult[] => [
      ...categories.map(item => { const alt = otherCategories.find(x => x.id === item.id); return { title: item.name, summary: item.description, image: item.imageUrl, href: `/${this.locale}/categories/${item.slug}`, type: this.metaText('category'), searchText: `${item.name} ${item.description ?? ''} ${alt?.name ?? ''} ${alt?.description ?? ''}` }; }),
      ...videos.map(item => { const alt = otherVideos.find(x => x.id === item.id); return { title: item.title, summary: item.description, image: item.thumbnailUrl, href: `/${this.locale}/watch/${item.slug}`, type: this.metaText('film'), searchText: `${item.title} ${item.description ?? ''} ${alt?.title ?? ''} ${alt?.description ?? ''}` }; }),
      ...podcasts.map(item => { const alt = otherPodcasts.find(x => x.id === item.id); return { title: item.title, summary: item.description, image: item.thumbnailUrl, href: `/${this.locale}/podcasts/${item.slug}`, type: this.metaText('podcast'), searchText: `${item.title} ${item.description ?? ''} ${item.guestName ?? ''} ${alt?.title ?? ''} ${alt?.description ?? ''} ${alt?.guestName ?? ''}` }; }),
      ...services.map(item => { const alt = otherServices.find(x => x.id === item.id); return { title: item.title, summary: item.shortDescription ?? item.description, image: item.imageUrl, href: `/${this.locale}/services/${item.slug}`, type: this.metaText('service'), searchText: `${item.title} ${item.description ?? ''} ${item.shortDescription ?? ''} ${alt?.title ?? ''} ${alt?.description ?? ''} ${alt?.shortDescription ?? ''}` }; }),
      ...projects.map(item => { const alt = otherProjects.find(x => x.id === item.id); return { title: item.title, summary: item.description, image: item.coverImageUrl, href: `/${this.locale}/projects/${item.slug}`, type: this.metaText('project'), searchText: `${item.title} ${item.description ?? ''} ${item.category ?? ''} ${alt?.title ?? ''} ${alt?.description ?? ''} ${alt?.category ?? ''}` }; }),
      ...articles.map(item => { const alt = otherArticles.find(x => x.id === item.id); return { title: item.title, summary: item.excerpt, image: item.coverImageUrl, href: `/${this.locale}/insights/${item.slug}`, type: this.metaText('article'), searchText: `${item.title} ${item.excerpt ?? ''} ${item.content ?? ''} ${alt?.title ?? ''} ${alt?.excerpt ?? ''} ${alt?.content ?? ''}` }; })
    ])).subscribe(results => { this.data.set(results); this.loading.set(false); });
  }
}

@Component({
  standalone: true,
  imports: [RouterLink, RevealDirective, ImageFallbackDirective],
  template: `
    <section ewReveal class="public-collection">
      @if (loading()) { <p class="py-20 text-center text-[#9a9a9a]" role="status">{{ t('text28') }}</p> }
      @else if (category(); as item) {
        <p class="eyebrow">{{ t('text29') }}</p><h1 class="section-title">{{ item.name }}</h1>
        @if (item.description) { <p class="mt-4 max-w-3xl leading-7 text-[#9a9a9a]">{{ item.description }}</p> }
        @if (videos().length) { <div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">@for (video of videos(); track video.id) {
          <a [routerLink]="'/' + locale + '/watch/' + video.slug" class="content-card group overflow-hidden">
            @if (video.thumbnailUrl) { <img ewImage decoding="async" [src]="video.thumbnailUrl" [alt]="video.title" loading="lazy" class="aspect-video w-full object-cover transition duration-500 group-hover:scale-105" /> }
            <div class="p-5"><h2 class="text-lg font-semibold group-hover:text-[var(--ew-accent)]">{{ video.title }}</h2><p class="mt-2 line-clamp-2 text-sm leading-6 text-[#9a9a9a]">{{ video.description }}</p></div>
          </a>
        }</div> } @else { <p class="mt-10 rounded-sm border border-white/10 bg-white/[.025] p-8 text-center text-[#9a9a9a]">{{ t('text30') }}</p> }
      } @else {
        <p class="eyebrow">404</p><h1 class="section-title">{{ t('text31') }}</h1><p class="mt-4 text-[#9a9a9a]">{{ t('text32') }}</p>
        <a [routerLink]="'/' + locale" class="mt-8 inline-flex rounded-full bg-[var(--ew-accent)] px-6 py-3 font-semibold text-[#050505]">{{ t('text33') }} <span class="directional-icon" aria-hidden="true">↗</span></a>
      }
    </section>
  `
})
export class CategoryDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly api = inject(PublicContentApi);
  private readonly seo = inject(SeoMetadataService);
  private readonly alternateRoute = inject(AlternateRouteService);
  readonly locale: Locale = this.route.parent?.snapshot.routeConfig?.path === 'ar' ? 'ar' : 'en';
  t(key: PublicUiKey): string { return this.locale === 'ar' ? arResources.publicUtility[key] : enResources.publicUtility[key]; }
  metaText(key: PublicMetaKey): string { return this.locale === 'ar' ? arResources.publicMeta[key] : enResources.publicMeta[key]; }
  readonly category = signal<PublicCategory | null>(null);
  readonly videos = signal<PublicVideo[]>([]);
  readonly loading = signal(true);
  private categoryLoad?: Subscription;

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map((params) => params.get('slug') ?? ''),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((slug) => this.loadCategory(slug));
  }

  private loadCategory(slug: string): void {
    this.categoryLoad?.unsubscribe();
    this.loading.set(true);
    this.category.set(null);
    this.videos.set([]);
    this.alternateRoute.set(null);
    this.categoryLoad = forkJoin({ categories: this.api.getCategories(this.locale).pipe(catchError(() => of([] as PublicCategory[]))), videos: this.api.getVideos(this.locale, slug).pipe(catchError(() => of({ items: [] as PublicVideo[], page: 1, pageSize: 24, totalCount: 0 }))) })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ categories, videos }) => {
        const found = categories.find(item => item.slug === slug) ?? null;
        this.category.set(found);
        this.videos.set(videos.items);
        if (found) {
          const alternate = `/${this.locale === 'ar' ? 'en' : 'ar'}/categories/${found.alternateSlug}`;
          this.alternateRoute.set(alternate);
          this.seo.update(this.locale, `/${this.locale}/categories/${encodeURIComponent(found.slug)}`, `${found.name} | East West Hub`, found.description ?? found.name, found.imageUrl, alternate);
        } else this.seo.update(this.locale, `/${this.locale}/categories/${encodeURIComponent(slug)}`, `${this.metaText('categoryNotFound')} | East West Hub`, this.metaText('categoryNotFoundDescription'));
        this.loading.set(false);
      });
  }
}

@Component({
  standalone: true,
  imports: [RouterLink, RevealDirective],
  template: `<div class="public-site" [attr.dir]="locale === 'ar' ? 'rtl' : 'ltr'"><section ewReveal class="mx-auto flex min-h-[80vh] max-w-4xl flex-col items-start justify-center px-5 py-20 sm:px-8"><p class="eyebrow">EAST WEST HUB · 404</p><h1 class="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{{ t('text34') }}</h1><p class="mt-5 max-w-xl leading-7 text-[#9a9a9a]">{{ t('text35') }}</p><a [routerLink]="'/' + locale" class="mt-8 rounded-full bg-[var(--ew-accent)] px-6 py-3 font-semibold text-[#050505]">{{ t('text36') }} <span class="directional-icon" aria-hidden="true">↗</span></a></section></div>`
})
export class NotFoundPage implements OnInit {
  private readonly seo = inject(SeoMetadataService);
  readonly locale: Locale = location.pathname.startsWith('/ar') ? 'ar' : 'en';
  t(key: PublicUiKey): string { return this.locale === 'ar' ? arResources.publicUtility[key] : enResources.publicUtility[key]; }
  metaText(key: PublicMetaKey): string { return this.locale === 'ar' ? arResources.publicMeta[key] : enResources.publicMeta[key]; }
  ngOnInit(): void { this.seo.update(this.locale, `/${this.locale}/404`, '404 | East West Hub', this.metaText('notFoundShort'), null, undefined, null, false); }
}
