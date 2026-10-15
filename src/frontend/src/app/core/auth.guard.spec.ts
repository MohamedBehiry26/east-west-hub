import { AuthService } from './auth.service';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard, superAdminGuard } from './auth.guard';

describe('admin route guard', () => {
  it('redirects unauthenticated users to login and preserves the requested route', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    const router = TestBed.inject(Router);
    const result = TestBed.runInInjectionContext(() => authGuard(
      {} as ActivatedRouteSnapshot,
      { url: '/admin/articles' } as RouterStateSnapshot
    ));

    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/admin/login?returnUrl=%2Fadmin%2Farticles');
  });
});

it('only permits server-approved account managers through the accounts guard',()=>{
 const auth={canManageAccounts:vi.fn(()=>false)};TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:auth}]});
 const router=TestBed.inject(Router);const blocked=TestBed.runInInjectionContext(()=>superAdminGuard({} as ActivatedRouteSnapshot,{} as RouterStateSnapshot));expect(router.serializeUrl(blocked as UrlTree)).toBe('/admin');
 auth.canManageAccounts.mockReturnValue(true);expect(TestBed.runInInjectionContext(()=>superAdminGuard({} as ActivatedRouteSnapshot,{} as RouterStateSnapshot))).toBe(true);
});
