import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ContentDetailPage } from './content-pages';
import { PublicContentApi } from '../core/public-content-api.service';
import { SeoMetadataService } from '../core/seo-metadata.service';
import { AlternateRouteService } from '../core/alternate-route.service';

describe('video detail page', () => {
  it('keeps the YouTube iframe unloaded until the user activates playback', () => {
    const video = {
      id: 'video-1', slug: 'creative-story', alternateSlug: 'hikayat-ibdaiya',
      title: 'Creative story', description: 'A short film', thumbnailUrl: 'https://images.example.test/thumb.jpg',
      youTubeVideoId: 'Abc12345678', publishedAt: null, duration: null, isFeatured: false,
      category: { id: 'category-1', slug: 'media', alternateSlug: 'ielam', name: 'Media', description: null, imageUrl: null, displayOrder: 0 },
      tags: []
    };
    const routeParams = new BehaviorSubject(convertToParamMap({ slug: video.slug }));
    const api = {
      getVideo: vi.fn((_locale: string, slug: string) => of({ ...video, slug, title: slug === video.slug ? video.title : 'Changed story' })),
      getVideos: vi.fn(() => of({ items: [], page: 1, pageSize: 12, totalCount: 0 }))
    };
    TestBed.configureTestingModule({
      imports: [ContentDetailPage],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { data: { kind: 'videos' }, paramMap: convertToParamMap({ slug: video.slug }) },
            paramMap: routeParams.asObservable(),
            parent: { snapshot: { routeConfig: { path: 'en' } } }
          }
        },
        { provide: PublicContentApi, useValue: api },
        { provide: SeoMetadataService, useValue: { update: vi.fn() } },
        { provide: AlternateRouteService, useValue: { set: vi.fn() } }
      ]
    });

    const fixture = TestBed.createComponent(ContentDetailPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Creative story');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    const playButton = fixture.nativeElement.querySelector('button[aria-label]');
    expect(playButton).not.toBeNull();
    playButton.click();
    fixture.detectChanges();

    const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe.src).toContain('https://www.youtube-nocookie.com/embed/Abc12345678');

    // Angular must not write src again during scroll/resize or unrelated state updates.
    const setSource = vi.spyOn(iframe, 'src', 'set');
    const stableSource = fixture.componentInstance.videoEmbedSource();
    for (let index = 0; index < 3; index++) {
      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('resize'));
      fixture.componentInstance.shareMessage.set(`Message ${index}`);
      fixture.detectChanges();
    }
    expect(fixture.nativeElement.querySelector('iframe')).toBe(iframe);
    expect(fixture.componentInstance.videoEmbedSource()).toBe(stableSource);
    expect(setSource).not.toHaveBeenCalled();

    routeParams.next(convertToParamMap({ slug: 'second-story' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Changed story');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(api.getVideo).toHaveBeenCalledTimes(2);
  });
});

describe('service detail language switching', () => {
  const service = (slug: string, alternateSlug: string, title: string) => ({ id:'service-1',slug,alternateSlug,title,shortDescription:null,description:'Body',features:null,process:null,imageUrl:null,seoTitle:null,seoDescription:null,displayOrder:0,relatedProjects:[] });
  function setup(url: string, slug: string) {
    const params = new BehaviorSubject(convertToParamMap({ slug }));
    const router = { url };
    const api = { getService: vi.fn((locale: string, currentSlug: string) => of(locale === 'ar' ? service(currentSlug,'english-service','خدمة') : service(currentSlug,'خدمة-عربية','Service'))) };
    const alternate = { set: vi.fn() };
    TestBed.configureTestingModule({imports:[ContentDetailPage],providers:[
      {provide: Router,useValue:router},
      {provide: ActivatedRoute,useValue:{snapshot:{data:{kind:'services',section:'services'},paramMap:convertToParamMap({slug})},paramMap:params.asObservable(),parent:{snapshot:{routeConfig:{path:url.startsWith('/ar')?'ar':'en'}}}}},
      {provide: PublicContentApi,useValue:api},{provide: SeoMetadataService,useValue:{update:vi.fn()}},{provide: AlternateRouteService,useValue:alternate}
    ]});
    const fixture=TestBed.createComponent(ContentDetailPage);fixture.detectChanges();return {fixture,params,router,api,alternate};
  }
  it('switches Arabic service details to the raw English alternate slug',()=>{const x=setup('/ar/services/خدمة-عربية','خدمة-عربية');expect(x.api.getService).toHaveBeenCalledWith('ar','خدمة-عربية');expect(x.alternate.set).toHaveBeenLastCalledWith('/en/services/english-service');x.router.url='/en/services/english-service';x.params.next(convertToParamMap({slug:'english-service'}));x.fixture.detectChanges();expect(x.api.getService).toHaveBeenLastCalledWith('en','english-service');});
  it('switches English service details to the raw Arabic alternate slug',()=>{const x=setup('/en/services/english-service','english-service');expect(x.alternate.set).toHaveBeenLastCalledWith('/ar/services/خدمة-عربية');x.router.url='/ar/services/خدمة-عربية';x.params.next(convertToParamMap({slug:'خدمة-عربية'}));x.fixture.detectChanges();expect(x.api.getService).toHaveBeenLastCalledWith('ar','خدمة-عربية');});
  it('replaces successful detail metadata with noindex when the next detail is missing', () => {
    const x = setup('/en/services/english-service', 'english-service');
    const seo = TestBed.inject(SeoMetadataService);
    x.api.getService.mockImplementationOnce(() => throwError(() => new HttpErrorResponse({status:404})));
    x.params.next(convertToParamMap({slug:'missing-service'})); x.fixture.detectChanges();
    expect(x.fixture.componentInstance.notFound).toBe(true);
    expect(seo.update).toHaveBeenLastCalledWith('en', '/en/services/missing-service', expect.any(String), '', null, undefined, null, false);
    expect(x.fixture.nativeElement.querySelector('h1')).toBeNull();
  });
});
