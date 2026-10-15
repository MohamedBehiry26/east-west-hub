import { Component, Input } from '@angular/core';
import { AdminRequestState } from './admin-request-state';
@Component({selector:'admin-request-feedback',standalone:true,template:`@if(state.message){<section class="rounded-xl border border-amber-300/30 bg-amber-300/5 p-3 text-sm text-amber-100"><p [attr.role]="state.unresolved || state.status()==='rejected' ? 'alert':'status'">{{state.message}}</p>@if(state.unresolved){<button type="button" class="mt-3 rounded-lg border border-amber-200/40 px-3 py-2" [disabled]="state.checking()" (click)="state.recheck()">{{state.retryLabel}}</button>}</section>}`})
export class AdminRequestFeedbackComponent {@Input({required:true})state!:AdminRequestState;}
