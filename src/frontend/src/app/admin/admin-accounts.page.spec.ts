import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NgForm } from '@angular/forms';
import { AdminAccountsPage } from './admin-accounts.page';

function setup() {
  TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});
  const fixture = TestBed.createComponent(AdminAccountsPage); fixture.detectChanges();
  const c = fixture.componentInstance;
  c.model = {displayName:'Admin',email:'new@example.test',password:'StrongPassword!234'};
  c.confirmPassword = c.model.password;
  const form = {invalid:false, control:{markAllAsTouched:vi.fn()},resetForm:vi.fn()} as unknown as NgForm;
  return {c,form,http:TestBed.inject(HttpTestingController)};
}
describe('administrator account creation', () => {
  it('creates once, clears password fields and confirms the new account', () => {
    const {c,form,http}=setup();
    c.save(form); c.save(form);
    const request=http.expectOne('/api/admin/accounts'); expect(request.request.method).toBe('POST');
    request.flush({email:'new@example.test'});
    expect(form.resetForm).toHaveBeenCalled(); expect(c.confirmPassword).toBe(''); expect(c.model.password).toBe(''); expect(c.success).toContain('new@example.test');
    http.verify();
  });
  it('rejects mismatched passwords without contacting the API', () => {
    const {c,form,http}=setup(); c.confirmPassword='different'; c.save(form);
    expect(c.error).toBeTruthy(); http.expectNone('/api/admin/accounts'); http.verify();
  });
  it('shows duplicate email feedback and keeps the form available', () => {
    const {c,form,http}=setup(); c.save(form);
    http.expectOne('/api/admin/accounts').flush({}, {status:409,statusText:'Conflict'});
    expect(c.error).toBeTruthy(); expect(c.saving).toBe(false); http.verify();
  });
});