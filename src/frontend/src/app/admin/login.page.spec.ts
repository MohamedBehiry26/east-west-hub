import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LoginPage } from './login.page';
import { AuthService } from '../core/auth.service';

describe('admin login form', () => {
  it('keeps submission disabled until required valid credentials are entered', async () => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: AuthService, useValue: { login: vi.fn(() => of({
          accessToken: 'test-token', tokenType: 'Bearer',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          user: { email: 'admin@example.test', displayName: 'Admin' }
        })) } }
      ]
    });

    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const submit = () => fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit().disabled).toBe(true);

    fixture.componentInstance.email = 'admin@example.test';
    fixture.componentInstance.password = 'valid-test-password';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(submit().disabled).toBe(false);
  });

  it('mirrors the login document direction when switching to Arabic', () => {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: AuthService, useValue: { login: vi.fn() } }
      ]
    });

    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const languageButton = fixture.nativeElement.querySelector('main button') as HTMLButtonElement;
    languageButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('main').getAttribute('lang')).toBe('ar');
    expect(fixture.nativeElement.querySelector('main').getAttribute('dir')).toBe('rtl');
  });
});
