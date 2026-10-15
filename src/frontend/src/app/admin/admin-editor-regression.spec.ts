import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminArticlesPage, AdminServicesPage } from './admin-content.pages';
import { NgForm } from '@angular/forms';
import { localPublicationDate } from './admin-form-validation';
for (const kind of ['articles','services'] as const) for (const mode of ['create','edit'] as const) {
 it(`${kind} ${mode} opens hidden invalid fields and recovers from server errors`,async ()=>{
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
  const fixture=kind==='articles' ? TestBed.createComponent(AdminArticlesPage) : TestBed.createComponent(AdminServicesPage);
  fixture.detectChanges();const http=TestBed.inject(HttpTestingController);http.expectOne('/api/admin/'+kind).flush([]);
  const c=fixture.componentInstance;c.startNew();Object.assign(c.model,{id:mode==='edit'?'id':'',titleEn:'Title',slugEn:'title',titleAr:'',slugAr:'عنوان',authorName:'Writer'});
  fixture.detectChanges();await fixture.whenStable();fixture.detectChanges();
  const form={controls:{},control:{markAllAsTouched:vi.fn()},invalid:false} as unknown as NgForm;
  c.save(form);fixture.detectChanges();await fixture.whenStable();expect(c.editingLanguage).toBe('ar');expect(fixture.nativeElement.querySelector('[name="titleAr"]').getAttribute('aria-invalid')).toBe('true');
  http.expectNone('/api/admin/'+kind+(mode==='edit'?'/id':''));
  c.model.titleAr='عنوان';c.save(form);c.save(form);const request=http.expectOne('/api/admin/'+kind+(mode==='edit'?'/id':''));expect(request.request.method).toBe(mode==='edit'?'PUT':'POST');
  request.flush({errors:{SlugAr:['Rejected']}},{status:400,statusText:'Bad Request'});expect(c.saving).toBe(false);expect(c.editing).toBe(true);expect(c.model.titleEn).toBe('Title');expect(c.editingLanguage).toBe('ar');
  c.save(form);http.expectOne('/api/admin/'+kind+(mode==='edit'?'/id':'')).flush({}, {status:500,statusText:'Error'});expect(c.saving).toBe(false);http.verify();
 });
}
it('round-trips UTC through local datetime and sends an explicit UTC instant',()=>{
 const instant='2026-10-01T13:45:00.000Z';expect(new Date(localPublicationDate(instant)!).toISOString()).toBe(instant);
 TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});const f=TestBed.createComponent(AdminArticlesPage);f.detectChanges();const http=TestBed.inject(HttpTestingController);http.expectOne('/api/admin/articles').flush([]);
 const c=f.componentInstance;c.startNew();Object.assign(c.model,{titleEn:'Title',titleAr:'عنوان',slugEn:'title',slugAr:'عنوان',authorName:'Writer',publishedAt:localPublicationDate(instant),isPublished:true});c.save({controls:{},control:{markAllAsTouched:vi.fn()},invalid:false} as unknown as NgForm);
 const request=http.expectOne('/api/admin/articles');expect(request.request.body.publishedAt).toBe(instant);request.flush({}, {status:500,statusText:'Error'});http.verify();
});

it('times out a stalled save and preserves the draft for retry',()=>{
 vi.useFakeTimers();
 try {
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});const f=TestBed.createComponent(AdminServicesPage);f.detectChanges();const http=TestBed.inject(HttpTestingController);http.expectOne('/api/admin/services').flush([]);const c=f.componentInstance;c.startNew();Object.assign(c.model,{titleEn:'Title',titleAr:'عنوان',slugEn:'title',slugAr:'عنوان'});c.save();const request=http.expectOne('/api/admin/services');expect(c.saving).toBe(true);vi.advanceTimersByTime(30001);expect(c.saving).toBe(false);expect(c.editing).toBe(true);expect(c.model.titleEn).toBe('Title');expect(request.cancelled).toBe(true);http.verify();
 } finally {vi.useRealTimers();}
});
