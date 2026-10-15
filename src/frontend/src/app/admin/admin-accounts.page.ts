import { isAmbiguousFailure } from './admin-request-state';
import { AdminFieldFeedbackDirective, publishFieldErrors } from './admin-field-feedback.directive';
import { Component, ChangeDetectorRef, ElementRef, OnInit, DestroyRef, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { accountFeedback } from './admin-simple-feedback';
import { AdminLocaleService } from '../core/admin-locale.service';

@Component({
  standalone: true, imports: [AdminFieldFeedbackDirective, FormsModule],
  template: `
  <section class="space-y-6 max-w-3xl">@if (uncertain) {<p role="alert">{{text('نتيجة الطلب غير مؤكدة. تحقق من حالة الحساب قبل أي إجراء آخر.','The result is uncertain. Check the account status before another action.')}}</p><button type="button" [disabled]="checking" (click)="checkStatus()">{{text('التحقق من حالة الحساب','Check account status')}}</button>}
    <header><h1 class="text-2xl font-semibold">{{text('حسابات الأدمن','Admin accounts')}}</h1><p class="mt-2 text-sm text-[#aaa]">{{text('أضف حسابًا جديدًا لإدارة محتوى الموقع.','Add a new account to manage website content.')}}</p></header>
    @if (success) {<p class="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100" role="status">{{success}}</p>}
    @if (error) {<p class="rounded-xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm text-rose-100" role="alert">{{error}}</p>}
    <section class="space-y-3" aria-label="Admin accounts">
      @for (account of accounts; track account.id) {
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4">
          <span>{{account.displayName}} · {{account.email}} · {{account.isActive ? text('نشط','Active') : text('غير نشط','Inactive')}}</span>
          @if (account.isSuperAdmin) { <span>{{text('حساب المالك المحمي','Protected owner account')}}</span> }
          @else { <button type="button" [disabled]="busy || saving || !!uncertain" [attr.aria-busy]="requests.pending().has(account.id)" (click)="changeStatus(account.id, !account.isActive)" class="rounded-lg border border-rose-300/40 px-3 py-2">{{account.isActive ? text('تعطيل','Deactivate') : text('إعادة التفعيل','Reactivate')}}</button> }
        </div>
      }
    </section>
    <form novalidate [adminFieldFeedback]="fieldValidation" #form="ngForm" (ngSubmit)="save(form)" class="space-y-5 rounded-2xl border border-white/10 bg-[#141414] p-5 sm:p-7">
      <h2 class="font-medium">{{text('إضافة أدمن','Add administrator')}}</h2>
      <label class="block text-sm">{{text('الاسم','Name')}}<input class="account-field" name="displayName" [(ngModel)]="model.displayName" required maxlength="160" autocomplete="name"></label>
      <label class="block text-sm">{{text('البريد الإلكتروني','Email')}}<input class="account-field" name="email" [(ngModel)]="model.email" type="email" required email maxlength="320" autocomplete="off" dir="ltr"></label>
      <label class="block text-sm">{{text('كلمة المرور','Password')}}<input class="account-field" name="password" [(ngModel)]="model.password" type="password" required minlength="12" maxlength="128" autocomplete="new-password" dir="ltr"></label>
      <p class="text-xs leading-6 text-[#aaa]">{{text('12 حرفًا على الأقل، مع حرف إنجليزي كبير وصغير ورقم ورمز.','At least 12 characters, including uppercase, lowercase, a number and a symbol.')}}</p>
      <label class="block text-sm">{{text('تأكيد كلمة المرور','Confirm password')}}<input class="account-field" name="confirmPassword" [(ngModel)]="confirmPassword" type="password" required autocomplete="new-password" dir="ltr"></label>
      <p class="text-sm text-[#d4a077]">{{text('الحساب الجديد يدير المحتوى فقط ولا يدير حسابات الأدمن.','The new account can manage content, but cannot manage administrator accounts.')}}</p>
      <button type="submit" [disabled]="saving || busy || !!uncertain" class="rounded-lg bg-[#d4a077] px-5 py-3 text-sm font-semibold text-[#17120e]">{{saving ? text('جارٍ الإنشاء…','Creating…') : text('إنشاء الحساب','Create account')}}</button>
    </form>
  </section>`,
  styles: [`.account-field { display:block; width:100%; min-height:44px; margin-top:8px; padding:10px 12px; border:1px solid #ffffff25; border-radius:8px; background:#0c0c0c; color:#eee; }`]
})
export class AdminAccountsPage implements OnInit {
  readonly requests = { pending: signal(new Set<string>()) };
  private readonly destroy = inject(DestroyRef);
  uncertain: {id:string; active:boolean} | null = null;
  checking = false;
  readonly fieldValidation = () => accountFeedback(this.model,this.confirmPassword);
  private readonly root=inject(ElementRef<HTMLElement>);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly locale = inject(AdminLocaleService);
  accounts: {id:string; email:string; displayName:string; isActive:boolean; isSuperAdmin:boolean}[] = [];
  busy = false;
  ngOnInit(): void { this.load(); }
  load(): void {
    this.http.get<typeof this.accounts>('/api/admin/accounts').pipe(timeout(30000),takeUntilDestroyed(this.destroy)).subscribe({
      next: rows => { this.accounts=rows; this.cdr.markForCheck(); },
      error: () => {this.error=this.text('تعذر تحميل الحسابات.','Could not load accounts.');this.cdr.markForCheck();}
    });
  }
  deactivate(id: string): void { this.changeStatus(id, false); }
  changeStatus(id:string, active:boolean):void {
    const account=this.accounts.find(row=>row.id===id);
    if(this.busy || this.saving || this.uncertain || !account || account.isSuperAdmin || account.isActive===active)return;
    if(!window.confirm(active ? this.text('إعادة تفعيل هذا الحساب؟','Reactivate this account?') : this.text('تعطيل هذا الحساب؟','Deactivate this account?')))return;
    this.error='';this.success='';this.busy=true;this.requests.pending.set(new Set([id]));
    const request=active ? this.http.post(`/api/admin/accounts/${id}/reactivate`, {}) : this.http.delete(`/api/admin/accounts/${id}`);
    request.pipe(timeout(30000),takeUntilDestroyed(this.destroy),finalize(()=>{this.busy=false;this.requests.pending.set(new Set());this.cdr.markForCheck();})).subscribe({
      next:()=>{this.accounts=this.accounts.map(row=>row.id===id?{...row,isActive:active}:row);this.statusSuccess(active);this.load();},
      error:response=>{
        if(isAmbiguousFailure(response))this.uncertain={id,active};
        else this.error=response.status===401 ? this.text('انتهت الجلسة. سجّل الدخول مجددًا.','Your session expired. Sign in again.') : response.status===403 ? this.text('ليس لديك صلاحية إدارة الحسابات.','You do not have permission to manage accounts.') : this.text('رفض الخادم تغيير حالة الحساب.','The server rejected the account status change.');
        this.cdr.markForCheck();
      }
    });
  }
  private statusSuccess(active:boolean):void {this.success=active ? this.text('تمت إعادة تفعيل الحساب.','Account reactivated.') : this.text('تم تعطيل الحساب.','Account deactivated.');}
  checkStatus():void {
    if(!this.uncertain || this.checking)return;
    const expected=this.uncertain;this.checking=true;this.error='';
    this.http.get<typeof this.accounts>('/api/admin/accounts').pipe(timeout(30000),takeUntilDestroyed(this.destroy),finalize(()=>{this.checking=false;this.cdr.markForCheck();})).subscribe({
      next:rows=>{this.accounts=rows;if(rows.some(row=>row.id===expected.id&&row.isActive===expected.active)){this.uncertain=null;this.statusSuccess(expected.active);}else this.error=this.text('لم تتأكد نتيجة الطلب بعد. لا تكرر الإرسال؛ تحقق مجددًا لاحقًا.','The outcome is not confirmed. Do not resubmit; check again later.');},
      error:()=>{this.error=this.text('تعذر التحقق من حالة الحساب.','Could not check account status.');}
    });
  }
  model = { displayName: '', email: '', password: '' }; confirmPassword = ''; saving = false; error = ''; success = '';
  text(ar: string, en: string): string { return this.locale.locale() === 'ar' ? ar : en; }
  save(form: NgForm): void {
    if (this.saving || this.busy || this.uncertain) return;
    this.error = ''; this.success = '';
    if (form.invalid || !this.model.displayName.trim()) { form.control.markAllAsTouched(); this.error = this.text('راجع الاسم والبريد وكلمة المرور وأكمل الحقول المطلوبة.','Check the name, email and password and complete all required fields.'); return; }
    if (this.model.password !== this.confirmPassword) { this.error = this.text('تأكيد كلمة المرور غير مطابق.','Passwords do not match.'); return; }
    if (!/[A-Z]/.test(this.model.password) || !/[a-z]/.test(this.model.password) || !/\d/.test(this.model.password) || !/[^a-zA-Z0-9]/.test(this.model.password)) { this.error = this.text('كلمة المرور تحتاج حرفًا إنجليزيًا كبيرًا وصغيرًا ورقمًا ورمزًا.','Password must include uppercase, lowercase, a number and a symbol.'); return; }
    this.saving = true;
    this.http.post<{email:string}>('/api/admin/accounts', { ...this.model, email: this.model.email.trim(), displayName: this.model.displayName.trim() }).pipe(timeout(30000),finalize(() => {this.saving=false; this.cdr.markForCheck();})).subscribe({
      next: account => { this.saving = false; this.model = { displayName: '', email: '', password: '' }; this.confirmPassword = ''; form.resetForm({displayName:'',email:'',password:'',confirmPassword:''}); this.load(); this.success = this.text('تم إنشاء الحساب ويمكن تسجيل الدخول بالبريد: ','Account created. Sign in with email: ') + account.email; this.cdr.markForCheck(); },
      error: response => { const errors:Record<string,string[]>={};
        if(response.status===409) errors['email']=['conflict'];
        else if(response.status===400){const codes=response.error?.errors;if(Array.isArray(codes)){if(codes.some((code:string)=>code.startsWith('Password')))errors['password']=['password'];if(codes.some((code:string)=>['InvalidEmail','InvalidUserName'].includes(code)))errors['email']=['email'];}else if(codes)Object.assign(errors,codes);else if(response.error?.title==='The owner email is reserved for the existing Super Admin account.')errors['email']=['reserved'];}
        publishFieldErrors(this.root.nativeElement,errors); this.saving = false; this.error = response.status === 409 ? this.text('البريد مسجل بالفعل. استخدم بريدًا آخر.','This email is already registered. Use another email.') : response.status === 401 ? this.text('انتهت الجلسة. سجّل الدخول مجددًا.','Your session expired. Sign in again.') : response.status === 403 ? this.text('ليس لديك صلاحية إنشاء حساب أدمن.','You do not have permission to create an administrator.') : this.text('تعذر إنشاء الحساب. راجع البيانات وشروط كلمة المرور ثم حاول مجددًا.','Could not create the account. Check the details and password requirements and retry.'); this.cdr.markForCheck(); }
    });
  }
}