import { TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { NgForm } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminHomePage } from './admin-home.page';
import { AdminVideosPage } from './admin-video.pages';
import { AdminCategoriesPage } from './admin-video.pages';
import { AdminArticlesPage, AdminPortfolioPage, AdminServicesPage } from './admin-content.pages';
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

describe('Categories create form',()=>{
  const existing={version:'a1111111-1111-4111-8111-111111111111',id:'c1',nameEn:'Production',nameAr:'إنتاج',slugEn:'production',slugAr:'intaj',descriptionEn:null,descriptionAr:null,imageUrl:null,displayOrder:0,isPublished:true};
  function setup(){TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});const fixture=TestBed.createComponent(AdminCategoriesPage);fixture.detectChanges();const http=TestBed.inject(HttpTestingController);http.expectOne('/api/admin/categories').flush([existing]);fixture.detectChanges();fixture.componentInstance.startNew();fixture.detectChanges();return {fixture,http};}
  it('shows validation and sends no request for an incomplete form',()=>{const {fixture,http}=setup();const markAllAsTouched=vi.fn();fixture.componentInstance.save({invalid:true,control:{markAllAsTouched}} as any);fixture.detectChanges();expect(markAllAsTouched).toHaveBeenCalledOnce();expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();http.expectNone('/api/admin/categories');http.verify();});
  it('creates once, normalizes an empty image URL, refreshes the list, and closes the editor',()=>{const {fixture,http}=setup();const c=fixture.componentInstance;c.model={...c.model,nameEn:'News',nameAr:'أخبار',slugEn:'news',slugAr:'akhbar',imageUrl:''};fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));const req=http.expectOne('/api/admin/categories');expect(req.request.method).toBe('POST');expect(req.request.body.imageUrl).toBeNull();req.flush({...existing,id:'c2',nameEn:'News',nameAr:'أخبار'});http.expectOne('/api/admin/categories').flush([existing,{...existing,id:'c2',nameEn:'News',nameAr:'أخبار'}]);fixture.detectChanges();expect(c.editing).toBe(false);expect(fixture.nativeElement.textContent).toContain('News');http.verify();});
});

describe('Projects save and list refresh',()=>{
  const existing={version:'a1111111-1111-4111-8111-111111111111',id:'p1',titleEn:'Existing project',titleAr:'مشروع قائم',slugEn:'existing-project',slugAr:'مشروع-قائم',client:null,categoryEn:null,categoryAr:null,descriptionEn:null,descriptionAr:null,challengeEn:null,challengeAr:null,approachEn:null,approachAr:null,solutionEn:null,solutionAr:null,resultsEn:null,resultsAr:null,coverImageUrl:null,projectDate:null,displayOrder:0,isFeatured:false,isPublished:false,seoTitleEn:null,seoTitleAr:null,seoDescriptionEn:null,seoDescriptionAr:null,images:[],serviceIds:[]};
  const created={...existing,id:'p2',titleEn:'New project',titleAr:'مشروع جديد',slugEn:'new-project',slugAr:'مشروع-جديد',isPublished:true};
  function setup(){TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});const fixture=TestBed.createComponent(AdminPortfolioPage);fixture.detectChanges();const http=TestBed.inject(HttpTestingController);http.expectOne('/api/admin/portfolio').flush([existing]);http.expectOne('/api/admin/services').flush([]);fixture.detectChanges();return {fixture,http};}
  it('creates once, reconciles the saved project immediately, and clears stale filters',()=>{const {fixture,http}=setup();const c=fixture.componentInstance;c.startNew();c.model={...c.model,titleEn:created.titleEn,titleAr:created.titleAr,slugEn:created.slugEn,slugAr:created.slugAr,isPublished:true};c.query='Non';c.statusFilter='draft';c.page=3;c.save();c.save();const request=http.expectOne('/api/admin/portfolio');expect(request.request.method).toBe('POST');request.flush(created);fixture.detectChanges();expect(c.items.map(item=>item.id)).toEqual(['p1','p2']);expect(c.query).toBe('');expect(c.statusFilter).toBe('all');expect(c.page).toBe(0);expect(c.editing).toBe(false);expect(fixture.nativeElement.textContent).toContain('New project');http.verify();});
  it('ignores an older list response that completes after a successful create',()=>{TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});const fixture=TestBed.createComponent(AdminPortfolioPage);fixture.detectChanges();const http=TestBed.inject(HttpTestingController);const initialList=http.expectOne('/api/admin/portfolio');http.expectOne('/api/admin/services').flush([]);const c=fixture.componentInstance;c.startNew();c.model={...c.model,titleEn:created.titleEn,titleAr:created.titleAr,slugEn:created.slugEn,slugAr:created.slugAr};c.save();http.expectOne('/api/admin/portfolio').flush(created);initialList.flush([]);fixture.detectChanges();expect(c.items).toEqual([created]);http.verify();});
  it('reconciles an edit without removing existing projects',()=>{const {fixture,http}=setup();const c=fixture.componentInstance;c.edit(existing);c.model={...c.model,titleEn:'Updated project'};c.save();const request=http.expectOne('/api/admin/portfolio/p1');expect(request.request.method).toBe('PUT');request.flush({...existing,titleEn:'Updated project'});fixture.detectChanges();expect(c.items).toHaveLength(1);expect(c.items[0].titleEn).toBe('Updated project');expect(c.editing).toBe(false);http.verify();});
  it('keeps the editor open and reports a failed save',()=>{const {fixture,http}=setup();const c=fixture.componentInstance;c.startNew();c.model={...c.model,titleEn:created.titleEn,titleAr:created.titleAr,slugEn:created.slugEn,slugAr:created.slugAr};c.save();http.expectOne('/api/admin/portfolio').flush({title:'Invalid project'}, {status:400,statusText:'Bad Request'});fixture.detectChanges();expect(c.editing).toBe(true);expect(c.saving).toBe(false);expect(fixture.nativeElement.querySelector('[role=alert]')).not.toBeNull();expect(c.items).toEqual([existing]);http.verify();});
});

describe('Articles create validation and save',()=>{
  const author={id:'a1',displayName:'Editorial author'};
  const saved={id:'a11',titleEn:'Article title',titleAr:'عنوان المقال',slugEn:'article-title',slugAr:'عنوان-المقال',excerptEn:null,excerptAr:null,contentEn:'English body',contentAr:'المحتوى العربي',coverImageUrl:null,authorId:author.id,authorName:author.displayName,publishedAt:null,isPublished:false,seoTitleEn:null,seoTitleAr:null,seoDescriptionEn:null,seoDescriptionAr:null};
  function setup(){TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});const fixture=TestBed.createComponent(AdminArticlesPage);fixture.detectChanges();const http=TestBed.inject(HttpTestingController);http.expectOne('/api/admin/articles').flush([]);fixture.detectChanges();fixture.componentInstance.startNew();fixture.detectChanges();return {fixture,http};}
  function fillRequired(c: AdminArticlesPage){c.model={...c.model,titleEn:saved.titleEn,titleAr:saved.titleAr,slugEn:saved.slugEn,slugAr:saved.slugAr,contentEn:saved.contentEn,contentAr:saved.contentAr,authorName:author.displayName,coverImageUrl:'',seoTitleEn:'',seoTitleAr:'',seoDescriptionEn:'',seoDescriptionAr:''};}
  it('identifies hidden Arabic title and slug as invalid and sends no request',()=>{const {fixture,http}=setup();const c=fixture.componentInstance;c.model.titleEn="English title";c.model.slugEn="english-title";c.model.authorName="Writer";const markAllAsTouched=vi.fn();const form={invalid:true,controls:{titleEn:{invalid:false},slugEn:{invalid:false},titleAr:{invalid:true},slugAr:{invalid:true}},control:{markAllAsTouched}} as unknown as NgForm;c.save(form);fixture.detectChanges();expect(markAllAsTouched).toHaveBeenCalledOnce();expect(c.editingLanguage).toBe('ar');expect(c.error).toBe('Review the highlighted required fields.');http.expectNone('/api/admin/articles');http.verify();});
  it('posts the valid bilingual article with optional empty strings normalized and refreshes the list',()=>{const {fixture,http}=setup();const c=fixture.componentInstance;fillRequired(c);fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));const request=http.expectOne('/api/admin/articles');expect(request.request.method).toBe('POST');expect(request.request.body.coverImageUrl).toBeNull();expect(request.request.body.seoTitleEn).toBeNull();expect(request.request.body.authorName).toBe(author.displayName);expect(request.request.body.authorId).toBeUndefined();request.flush(saved);http.expectOne('/api/admin/articles').flush([saved]);fixture.detectChanges();expect(c.editing).toBe(false);expect(fixture.nativeElement.textContent).toContain('Article title');http.verify();});
  it('keeps the editor open and shows an API validation error',()=>{const {fixture,http}=setup();const c=fixture.componentInstance;fillRequired(c);fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));http.expectOne('/api/admin/articles').flush({errors:{SlugAr:['Already used']}},{status:400,statusText:'Bad Request'});fixture.detectChanges();expect(c.editing).toBe(true);expect(c.saving).toBe(false);expect(fixture.nativeElement.textContent).toContain('The API rejected one or more article fields. Review the highlighted fields.');http.verify();});
  it('shows the active-author rejection for a complete bilingual article after the API request',()=>{const {fixture,http}=setup();const c=fixture.componentInstance;fillRequired(c);fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));http.expectOne('/api/admin/articles').flush({title:'Select an active author.'},{status:409,statusText:'Conflict'});fixture.detectChanges();expect(c.editing).toBe(true);expect(c.error).toBe('Enter an author name before saving.');http.verify();});
});
