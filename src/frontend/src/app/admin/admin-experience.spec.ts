import { TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminHomePage } from './admin-home.page';
import { AdminVideosPage } from './admin-video.pages';
import { AdminServicesPage } from './admin-content.pages';
import { ContentBodyComponent } from '../shared/content-body.component';

describe('media CMS dashboard',()=>{
  function setup(){TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});const f=TestBed.createComponent(AdminHomePage);f.detectChanges();return {f,http:TestBed.inject(HttpTestingController)};}
  it('calculates publishing, podcast and catalog metrics from responses',()=>{
    const {f,http}=setup();const base={id:'1',titleEn:'Demo',titleAr:'تجريبي',descriptionEn:'Example',descriptionAr:'مثال',contentType:'video',thumbnailUrl:null,isPublished:true,isFeatured:false,publishedAt:'2026-09-01T00:00:00Z'};
    http.expectOne('/api/admin/videos').flush([base,{...base,id:'2',contentType:'podcast',isPublished:false},{...base,id:'3',publishedAt:'2099-01-01T00:00:00Z'}]);
    for(const path of ['categories','services','portfolio','articles'])http.expectOne('/api/admin/'+path).flush([{}]);
    f.detectChanges();expect(f.componentInstance.published).toBe(1);expect(f.componentInstance.drafts).toBe(1);expect(f.componentInstance.scheduled).toBe(1);expect(f.componentInstance.cards.find(x=>x.label==='Podcasts')?.value).toBe(1);http.verify();
  });
  it('does not present failed metrics as zero',()=>{
    const {f,http}=setup();for(const req of http.match(()=>true))req.flush({}, {status:503,statusText:'Unavailable'});
    f.detectChanges();expect(f.componentInstance.error()).toBe(true);expect(f.componentInstance.cards.every(x=>x.value===null)).toBe(true);expect(f.nativeElement.querySelector('[role=alert]')).not.toBeNull();http.verify();
  });
});
describe('safe editorial body',()=>{
  it('renders headings, paragraphs, lists and quotations while escaping HTML',()=>{
    const f=TestBed.createComponent(ContentBodyComponent);f.componentRef.setInput('body','## Heading\n\nParagraph\n\n- One\n- Two\n\n> Quote\n\n<script>alert(1)</script>');f.detectChanges();
    expect(f.nativeElement.querySelectorAll('h3').length).toBe(1);expect(f.nativeElement.querySelectorAll('li').length).toBe(2);expect(f.nativeElement.querySelector('blockquote').textContent).toContain('Quote');expect(f.nativeElement.querySelector('script')).toBeNull();expect(f.nativeElement.textContent).toContain('<script>');
  });
});

describe('first-load Admin data',()=>{
  function setup<T>(component: Type<T>) {
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});
    const fixture=TestBed.createComponent(component);fixture.detectChanges();
    return {fixture,http:TestBed.inject(HttpTestingController)};
  }
  const category={id:'c1',nameEn:'Production',nameAr:'إنتاج',slugEn:'production',slugAr:'intaj',descriptionEn:null,descriptionAr:null,imageUrl:null,displayOrder:0,isPublished:true};
  const video={id:'v1',youTubeVideoId:null,titleEn:'First navigation video',titleAr:'فيديو التنقل الأول',slugEn:'first-video',slugAr:'first-video',descriptionEn:'Ready',descriptionAr:'جاهز',thumbnailUrl:null,publishedAt:null,duration:null,categoryId:'c1',categoryNameEn:'Production',categoryNameAr:'إنتاج',isFeatured:false,isPublished:true,displayOrder:0,tags:[],contentType:'video',episodeNumber:null,seasonNumber:null,guestNameEn:null,guestNameAr:null,seoTitleEn:null,seoTitleAr:null,seoDescriptionEn:null,seoDescriptionAr:null};
  it('loads and renders Videos from its first component initialization',()=>{
    const {fixture,http}=setup(AdminVideosPage);
    http.expectOne('/api/admin/videos').flush([video]);http.expectOne('/api/admin/categories').flush([category]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('First navigation video');http.verify();
  });
  it('loads and renders Services from its first component initialization',()=>{
    const {fixture,http}=setup(AdminServicesPage);
    http.expectOne('/api/admin/services').flush([{id:'s1',titleEn:'Strategy',titleAr:'استراتيجية',slugEn:'strategy',slugAr:'strategy',shortDescriptionEn:'',shortDescriptionAr:'',descriptionEn:'Ready',descriptionAr:'جاهز',featuresEn:'',featuresAr:'',processEn:'',processAr:'',imageUrl:'',displayOrder:0,isPublished:true,seoTitleEn:'',seoTitleAr:'',seoDescriptionEn:'',seoDescriptionAr:''}]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Strategy');http.verify();
  });
});
