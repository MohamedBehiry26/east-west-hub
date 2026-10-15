import { validateProject, validateMedia, catalogFieldErrors } from './admin-catalog-validation';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminVideosPage } from './admin-video.pages';
import { AdminPortfolioPage } from './admin-content.pages';
import { AdminLocaleService } from '../core/admin-locale.service';

const project={titleEn:'Project',titleAr:'مشروع',slugEn:'project',slugAr:'مشروع',displayOrder:-1,coverImageUrl:'/assets/existing.png',images:[],projectDate:null};
const media={...project,titleEn:'Media',categoryId:'category',youTubeUrl:'https://youtu.be/M7lc1UVf-VE',contentType:'video',thumbnailUrl:'https://example.test/poster.jpg',episodeNumber:null,seasonNumber:null,tags:[]};
describe('Projects and Media contract validation',()=>{
  it('accepts valid projects, site-relative artwork, optional blank gallery rows and unbounded story text',()=>{expect(validateProject({...project,descriptionEn:'x'.repeat(3000),images:[{imageUrl:'',displayOrder:0}]})).toEqual({});});
  it('accepts all existing media types without imposing podcast-only dependencies',()=>{for(const contentType of ['video','podcast','program','interview','campaign','documentary','originalContent','event','brandedContent','other']) expect(validateMedia({...media,contentType,episodeNumber:1,seasonNumber:null},true,true)).toEqual({});});
  it('does not mutate an existing valid payload',()=>{const copy=structuredClone(media);validateMedia(media,true,true);expect(media).toEqual(copy);});
  for(const field of ['titleEn','titleAr','slugEn','slugAr']) it(`rejects missing ${field} on both editors`,()=>{expect(validateProject({...project,[field]:' '})).toHaveProperty(field);expect(validateMedia({...media,[field]:''},false,true)).toHaveProperty(field);});
  it('checks project limits and nested image limits without rejecting boundary values',()=>{expect(validateProject({...project,titleEn:'x'.repeat(200)})).toEqual({});expect(validateProject({...project,titleEn:'x'.repeat(201),client:'x'.repeat(161),images:[{imageUrl:'x'.repeat(2049),altTextAr:'x'.repeat(251),displayOrder:1.5}]})).toMatchObject({titleEn:['length'],client:['length'],image0:['length'],altAr0:['length'],order0:['invalid']});});
  it('checks media lengths, types, positive integer metadata and required category',()=>{expect(validateMedia({...media,titleEn:'x'.repeat(251),seoDescriptionAr:'x'.repeat(501),contentType:'unknown',categoryId:'',episodeNumber:0,seasonNumber:1.2},false,true)).toMatchObject({titleEn:['length'],seoDescriptionAr:['length'],contentType:['invalid'],categoryId:['required'],episodeNumber:['invalid'],seasonNumber:['invalid']});});
  it('validates thumbnail URLs using current server URL protocols',()=>{for(const thumbnailUrl of ['not a url','https://','javascript:alert(1)','/relative.png'])expect(validateMedia({...media,thumbnailUrl},true,true)).toHaveProperty('thumbnailUrl');for(const thumbnailUrl of ['','http://example.test/a','ftp://example.test/a','https://example.test/a'])expect(validateMedia({...media,thumbnailUrl},true,true)).toEqual({});});
  it('requires valid YouTube input on create but preserves blank existing poster-only edits',()=>{expect(validateMedia({...media,youTubeUrl:''},false,false)).toHaveProperty('youTubeUrl');expect(validateMedia({...media,youTubeUrl:''},true,false)).toEqual({});expect(validateMedia({...media,youTubeUrl:'invalid'},true,false)).toHaveProperty('youTubeUrl');});
  it('checks tag count, bilingual tag dependency and lengths',()=>{expect(validateMedia({...media,tags:[{nameEn:'Tag',nameAr:''}]},true,true)).toHaveProperty('tagAr0');expect(validateMedia({...media,tags:Array.from({length:21},()=>({nameEn:'Tag',nameAr:'وسم'}))},true,true)).toHaveProperty('tags');expect(validateMedia({...media,tags:[{nameEn:'x'.repeat(101),nameAr:'وسم'}]},true,true)).toHaveProperty('tagEn0');});
  it('rejects impossible dates and noninteger order without imposing publication requirements',()=>{expect(validateProject({...project,projectDate:'2026-02-30',displayOrder:0.2})).toMatchObject({projectDate:['invalid'],displayOrder:['invalid']});});
  it('maps nested server feedback to existing field names',()=>{expect(catalogFieldErrors({'Images[0].AltTextAr':['invalid'],'Tags[2].NameEn':['invalid']})).toEqual({altAr0:['invalid'],tagEn2:['invalid']});});
});
describe('Project validation UI',()=>{
  for(const language of ['en','ar'] as const) it(`shows accessible ${language} errors without submitting and opens hidden invalid tab`,async()=>{
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});TestBed.inject(AdminLocaleService).locale.set(language);
    const fixture=TestBed.createComponent(AdminPortfolioPage);fixture.detectChanges();const http=TestBed.inject(HttpTestingController);http.expectOne('/api/admin/portfolio').flush([]);http.expectOne('/api/admin/services').flush([]);
    const c=fixture.componentInstance;c.startNew();Object.assign(c.model,project,{titleAr:''});fixture.detectChanges();await fixture.whenStable();c.save();fixture.detectChanges();await fixture.whenStable();
    expect(c.editingLanguage).toBe('ar');const field=fixture.nativeElement.querySelector('[name=titleAr]');expect(field.getAttribute('aria-invalid')).toBe('true');expect(field.getAttribute('aria-describedby')).toContain('editor-error');expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(language==='ar'?'راجع الحقول':'Review the highlighted');http.expectNone('/api/admin/portfolio');http.verify();
  });
});

describe('Media validation UI',()=>{
  for(const language of ['en','ar'] as const) it(`shows accessible ${language} invalid-field feedback and switches to Arabic`,async()=>{
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});TestBed.inject(AdminLocaleService).locale.set(language);
    const fixture=TestBed.createComponent(AdminVideosPage);fixture.detectChanges();const http=TestBed.inject(HttpTestingController);http.expectOne('/api/admin/videos').flush([]);http.expectOne('/api/admin/categories').flush([]);
    const c=fixture.componentInstance;c.startNew();Object.assign(c.model,media,{titleAr:''});fixture.detectChanges();await fixture.whenStable();c.save({invalid:false});fixture.detectChanges();await fixture.whenStable();
    expect(c.editingLanguage).toBe('ar');expect(fixture.nativeElement.querySelector('[name=titleAr]').getAttribute('aria-invalid')).toBe('true');expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(language==='ar'?'راجع الحقول':'Review the highlighted');http.expectNone('/api/admin/videos');http.verify();
  });
  it('maps nested server validation feedback without discarding the draft',async()=>{
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([])]});
    const fixture=TestBed.createComponent(AdminVideosPage);fixture.detectChanges();const http=TestBed.inject(HttpTestingController);http.expectOne('/api/admin/videos').flush([]);http.expectOne('/api/admin/categories').flush([]);const c=fixture.componentInstance;c.startNew();Object.assign(c.model,media,{tags:[{nameEn:'Tag',nameAr:'وسم'}]});fixture.detectChanges();await fixture.whenStable();c.save({invalid:false});http.expectOne('/api/admin/videos').flush({errors:{'Tags[0].NameAr':['invalid']}},{status:400,statusText:'Bad Request'});fixture.detectChanges();expect(c.editing).toBe(true);expect(c.model.titleEn).toBe('Media');expect(fixture.nativeElement.querySelector('[name=tagAr0]').getAttribute('aria-invalid')).toBe('true');http.verify();
  });
});
