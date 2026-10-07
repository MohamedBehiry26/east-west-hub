import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
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

    routeParams.next(convertToParamMap({ slug: 'second-story' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Changed story');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(api.getVideo).toHaveBeenCalledTimes(2);
  });
});
