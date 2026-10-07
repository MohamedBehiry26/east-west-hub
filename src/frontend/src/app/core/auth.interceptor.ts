import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');
  const requestUrl = request.url.split(/[?#]/, 1)[0].replace(/\/+$/, '');
  const isApiRequest = !!apiBaseUrl && (requestUrl === apiBaseUrl || requestUrl.startsWith(`${apiBaseUrl}/`));
  const token = isApiRequest ? auth.accessToken() : null;
  if (!token) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.logout();
      }
      return throwError(() => error);
    })
  );
};
