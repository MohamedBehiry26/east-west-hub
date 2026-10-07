import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('admin auth interceptor', () => {
  let http: HttpClient;
  let testing: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    testing = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => testing.verify());

  it('sends the bearer token only to the configured API path', () => {
    auth.login({ email: 'admin@example.test', password: 'temporary-test-password' }).subscribe();
    testing.expectOne('/api/auth/login').flush({
      accessToken: 'test-token', tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      user: { email: 'admin@example.test', displayName: 'Admin' }
    });

    http.get('/api/admin/session').subscribe();
    const protectedRequest = testing.expectOne('/api/admin/session');
    expect(protectedRequest.request.headers.get('Authorization')).toBe('Bearer test-token');
    protectedRequest.flush({});

    http.get('https://third-party.example.test/api/data').subscribe();
    const externalRequest = testing.expectOne('https://third-party.example.test/api/data');
    expect(externalRequest.request.headers.has('Authorization')).toBe(false);
    externalRequest.flush({});

    http.get('/apiary/resource').subscribe();
    const similarPrefix = testing.expectOne('/apiary/resource');
    expect(similarPrefix.request.headers.has('Authorization')).toBe(false);
    similarPrefix.flush({});
  });

  it('does not accept an expired token', () => {
    auth.login({ email: 'admin@example.test', password: 'temporary-test-password' }).subscribe();
    testing.expectOne('/api/auth/login').flush({
      accessToken: 'expired-token', tokenType: 'Bearer',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
      user: { email: 'admin@example.test', displayName: 'Admin' }
    });
    expect(auth.isAuthenticated()).toBe(false);
  });
});
