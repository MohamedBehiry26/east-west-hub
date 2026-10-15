import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AdminAccountsPage } from './admin-accounts.page';
import { AdminLocaleService } from '../core/admin-locale.service';
const row=(active=false,owner=false)=>({id:'target',email:'fixture@example.test',displayName:'Fixture',isActive:active,isSuperAdmin:owner});
function setup(ar=false,active=false,owner=false){
 TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
 TestBed.inject(AdminLocaleService).locale.set(ar?'ar':'en');
 const fixture=TestBed.createComponent(AdminAccountsPage);fixture.detectChanges();
 const http=TestBed.inject(HttpTestingController);http.expectOne('/api/admin/accounts').flush([row(active,owner)]);fixture.detectChanges();
 return {fixture,c:fixture.componentInstance,http};
}
for(const ar of [false,true])for(const active of [false,true])it(`localized status action ar=${ar} active=${active} refreshes and prevents duplicates`,()=>{
 const {fixture,c,http}=setup(ar,active);const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);
 try{
 const button=Array.from(fixture.nativeElement.querySelectorAll('button')).find((b:any)=>b.textContent.includes(ar?(active?'تعطيل':'إعادة التفعيل'):(active?'Deactivate':'Reactivate'))) as HTMLButtonElement;
 expect(button).toBeTruthy();button.click();c.changeStatus('target',!active);fixture.detectChanges();expect(button.disabled).toBe(true);expect(button.getAttribute('aria-busy')).toBe('true');
 const req=http.expectOne(active?'/api/admin/accounts/target':'/api/admin/accounts/target/reactivate');expect(req.request.method).toBe(active?'DELETE':'POST');req.flush(null);
 http.expectOne('/api/admin/accounts').flush([row(!active)]);fixture.detectChanges();
 expect(c.accounts[0].isActive).toBe(!active);expect(c.success).toBeTruthy();expect(fixture.nativeElement.querySelector('[role=status]')).toBeTruthy();expect(confirm).toHaveBeenCalledOnce();
 // Opposite action remains available after deactivation/reactivation.
 c.changeStatus('target',active);http.expectOne(active?'/api/admin/accounts/target/reactivate':'/api/admin/accounts/target').flush(null);http.expectOne('/api/admin/accounts').flush([row(active)]);expect(c.accounts[0].isActive).toBe(active);http.verify();
 }finally{confirm.mockRestore();}
});
it('cancels without sending a request and never offers an Owner action',()=>{const {c,http,fixture}=setup(false,true,true);const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);try{c.deactivate('target');expect(confirm).not.toHaveBeenCalled();expect(fixture.nativeElement.textContent).toContain('Protected owner account');c.accounts=[row(false)];c.changeStatus('target',true);http.expectNone(r=>r.method!=='GET');http.verify();}finally{confirm.mockRestore();}});
for(const status of [401,403,404,409])it(`definitive ${status} rejection preserves state and releases controls`,()=>{const {c,http}=setup();const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);try{c.changeStatus('target',true);http.expectOne('/api/admin/accounts/target/reactivate').flush({}, {status,statusText:'Rejected'});expect(c.accounts[0].isActive).toBe(false);expect(c.error).toBeTruthy();expect(c.busy).toBe(false);expect(c.uncertain).toBeNull();http.verify();}finally{confirm.mockRestore();}});
for(const ar of [false,true])it(`ambiguous failure ar=${ar} offers GET-only recovery without retry`,()=>{
 const {c,http,fixture}=setup(ar);const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);try{
 c.changeStatus('target',true);http.expectOne('/api/admin/accounts/target/reactivate').error(new ProgressEvent('error'));fixture.detectChanges();expect(c.uncertain).not.toBeNull();expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();c.changeStatus('target',true);http.expectNone(r=>r.method==='POST');
 c.checkStatus();c.checkStatus();http.expectOne('/api/admin/accounts').flush([row(false)]);expect(c.uncertain).not.toBeNull();
 c.checkStatus();http.expectOne('/api/admin/accounts').flush([row(true)]);expect(c.uncertain).toBeNull();expect(c.accounts[0].isActive).toBe(true);http.expectNone(r=>r.method!=='GET');http.verify();
 }finally{confirm.mockRestore();}
});
it('timeout does not retry and failed status checks remain blocked',async()=>{vi.useFakeTimers();const {c,http}=setup();const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);try{c.changeStatus('target',true);const req=http.expectOne('/api/admin/accounts/target/reactivate');await vi.advanceTimersByTimeAsync(30001);expect(req.cancelled).toBe(true);expect(c.uncertain).not.toBeNull();c.checkStatus();http.expectOne('/api/admin/accounts').flush({}, {status:503,statusText:'Unavailable'});expect(c.uncertain).not.toBeNull();expect(c.checking).toBe(false);c.changeStatus('target',true);http.expectNone(r=>r.method!=='GET');http.verify();}finally{confirm.mockRestore();vi.useRealTimers();}});
