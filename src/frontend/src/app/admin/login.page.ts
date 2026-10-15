import { AdminFieldFeedbackDirective } from './admin-field-feedback.directive';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminTextPipe } from '../core/admin-text.pipe';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { AdminLocaleService } from '../core/admin-locale.service';

@Component({
  standalone: true,
  imports: [AdminFieldFeedbackDirective, FormsModule, RouterLink, AdminTextPipe],
  templateUrl: './login.page.html',
  styleUrl: './login.page.css'
})
export class LoginPage {
  readonly fieldValidation = () => ({...(!this.email.trim()?{email:['required']}:!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())?{email:['email']} :{}),...(!this.password?{password:['required']}: {})});
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly locale = inject(AdminLocaleService);

  ngOnInit(): void { this.locale.set(this.locale.locale()); }
  toggleLocale(): void { this.locale.set(this.locale.locale() === 'en' ? 'ar' : 'en'); }

  email = '';
  password = '';
  readonly showPassword = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    if (this.isSubmitting()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim()) || !this.password) { this.errorMessage.set('Enter your email and password.'); return; }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.auth.login({ email: this.email.trim(), password: this.password })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
      next: () => {
        this.password = '';
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const destination = !!returnUrl && /^\/admin(?:\/|$|[?#])/.test(returnUrl) && !returnUrl.startsWith('//')
          ? returnUrl
          : '/admin';
        void this.router.navigateByUrl(destination);
      },
      error: () => this.errorMessage.set('Unable to sign in. Check your details and try again.'),
      });
  }
}
