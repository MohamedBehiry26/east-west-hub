import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminVideosPage } from './admin-video.pages';

describe('manual YouTube video management', () => {
  it('matches Arabic without diacritics and full YouTube links while respecting status', () => {
    const {component,http} = setup();
    component.videos = [{...saved,titleAr:'إِعْلَام جديد'}];
    component.query = 'اعلام'; expect(component.filteredVideos).toHaveLength(1);
    component.query = 'https://youtu.be/M7lc1UVf-VE'; expect(component.filteredVideos).toHaveLength(1);
    component.statusFilter = 'draft'; expect(component.filteredVideos).toHaveLength(0);
    http.verify();
  });
  const category={id:'category-1',nameEn:'Media',nameAr:'إعلام',slugEn:'media',slugAr:'media',descriptionEn:null,descriptionAr:null,imageUrl:null,displayOrder:0,isPublished:true};
  const saved={version:'a1111111-1111-4111-8111-111111111111',id:'video-1',youTubeVideoId:'M7lc1UVf-VE',titleEn:'Manual video',titleAr:'فيديو يدوي',slugEn:'manual-video',slugAr:'manual-video-ar',descriptionEn:null,descriptionAr:null,thumbnailUrl:null,publishedAt:null,duration:null,categoryId:category.id,categoryNameEn:'Media',categoryNameAr:'إعلام',isFeatured:false,isPublished:true,displayOrder:0,tags:[],contentType:'video' as const,episodeNumber:null,seasonNumber:null,guestNameEn:null,guestNameAr:null,seoTitleEn:null,seoTitleAr:null,seoDescriptionEn:null,seoDescriptionAr:null};
  function setup(){TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});const fixture=TestBed.createComponent(AdminVideosPage);fixture.detectChanges();const http=TestBed.inject(HttpTestingController);http.expectOne('/api/admin/videos').flush([]);http.expectOne('/api/admin/categories').flush([category]);fixture.detectChanges();fixture.componentInstance.startNew();return {fixture,http,component:fixture.componentInstance};}
  function fill(component:AdminVideosPage,url='https://youtu.be/M7lc1UVf-VE'){component.model={...component.model,youTubeUrl:url,titleEn:saved.titleEn,titleAr:saved.titleAr,slugEn:saved.slugEn,slugAr:saved.slugAr,categoryId:category.id,isPublished:true};component.updatePreview();}
  it('shows no preview and sends no request for an invalid YouTube URL',()=>{const {fixture,http,component}=setup();fill(component,'https://example.test/video');component.save({invalid:false});fixture.detectChanges();expect(component.previewUrl).toBeNull();expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();http.expectNone('/api/admin/videos');http.verify();});
  it('extracts a safe preview and creates the selected published video once',()=>{const {fixture,http,component}=setup();fill(component);expect(component.previewUrl).not.toBeNull();component.save({invalid:false});component.save({invalid:false});const request=http.expectOne('/api/admin/videos');expect(request.request.method).toBe('POST');expect(request.request.body.youTubeUrl).toBe('https://youtu.be/M7lc1UVf-VE');request.flush(saved);fixture.detectChanges();expect(component.videos).toEqual([saved]);expect(component.editing).toBe(false);http.verify();});
  it('sends the normalized edit link and keeps the record manageable',()=>{const {fixture,http,component}=setup();component.videos=[saved];component.edit(saved);component.model.youTubeUrl='https://www.youtube.com/embed/M7lc1UVf-VE';component.save({invalid:false});const request=http.expectOne('/api/admin/videos/video-1');expect(request.request.method).toBe('PUT');request.flush({...saved,titleEn:'Edited'});fixture.detectChanges();expect(component.videos[0].titleEn).toBe('Edited');http.verify();});
  it('preserves tags, podcast details and SEO on an ordinary title edit',()=>{
    const {http,component}=setup();
    const item={...saved,contentType:'podcast' as const,tags:[{nameEn:'Media',nameAr:'إعلام'}],episodeNumber:3,seasonNumber:2,guestNameEn:'Guest',guestNameAr:'ضيف',seoTitleEn:'SEO',seoTitleAr:'عنوان',seoDescriptionEn:'Description',seoDescriptionAr:'وصف'};
    component.videos=[item];component.edit(item);component.model.titleEn='Edited';
    component.model.tags[0].nameAr='إعلام';expect(component.model.tags[0]).not.toBe(item.tags[0]);
    component.save({invalid:false});const request=http.expectOne('/api/admin/videos/video-1');
    for(const key of ['tags','episodeNumber','seasonNumber','guestNameEn','guestNameAr','seoTitleEn','seoTitleAr','seoDescriptionEn','seoDescriptionAr'] as const)
      expect(request.request.body[key]).toEqual(item[key]);
    request.flush({...item,titleEn:'Edited'});http.verify();
  });
  it('keeps an existing poster-only record editable and retains the editor after a definitive rejected save',()=>{
    const {http,component}=setup();const item={...saved,youTubeVideoId:null,thumbnailUrl:'https://example.test/poster.jpg'};
    component.videos=[item];component.edit(item);component.save({invalid:false});
    const request=http.expectOne('/api/admin/videos/video-1');expect(request.request.body.youTubeUrl).toBe('');
    request.flush({}, {status:403,statusText:'Forbidden'});expect(component.saving).toBe(false);expect(component.editing).toBe(true);expect(component.videos).toEqual([item]);
    component.save({invalid:false});http.expectOne('/api/admin/videos/video-1').flush(item);http.verify();
  });
  it('renders metadata controls and all supported media types',()=>{
    const {http,fixture}=setup();fixture.detectChanges();const root=fixture.nativeElement;
    for(const name of ['episodeNumber','seasonNumber','guestNameEn','guestNameAr','seoTitleEn','seoTitleAr','seoDescriptionEn','seoDescriptionAr']) expect(root.querySelector(`[name=${name}]`)).not.toBeNull();
    expect(root.querySelectorAll('[name=contentType] option')).toHaveLength(10);http.verify();
  });
});


