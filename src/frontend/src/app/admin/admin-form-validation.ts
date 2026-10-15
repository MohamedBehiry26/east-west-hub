import { NgForm } from '@angular/forms';
import { publishFieldErrors } from './admin-field-feedback.directive';

/** Shared field feedback for bilingual editors; never changes the user's model. */
export function validateEditor(model: object, form: NgForm | undefined, titleLimit: number): Record<string, string[]> {
  const errors: Record<string,string[]> = {};
  const values = model as Record<string,unknown>;
  const required = ['titleEn','titleAr','slugEn','slugAr',...('authorName' in values ? ['authorName'] : [])];
  for (const name of required) if (!String(values[name] ?? '').trim()) errors[name]=['required'];
  for (const [name,value] of Object.entries(values)) {
    const limit = name.startsWith('slug') ? 180 : name.startsWith('title') ? titleLimit : name==='authorName' ? 160 : /^(coverImageUrl|imageUrl)$/.test(name) ? 2048 : titleLimit===250 && /^(excerpt|seoDescription)/.test(name) ? 500 : titleLimit===250 && name.startsWith('seoTitle') ? 250 : undefined;
    if (limit && typeof value==='string' && value.length>limit) errors[name]=['length'];
  }
  for (const name of ['imageUrl','coverImageUrl']) {
    const value=String(values[name] ?? '').trim();
    if (value && !/^\/(?!\/)/.test(value)) {try { if (!['http:','https:'].includes(new URL(value).protocol)) errors[name]=['url']; } catch {errors[name]=['url'];}}
  }
  if (values['publishedAt'] && !Number.isFinite(new Date(String(values['publishedAt'])).getTime())) errors['publishedAt']=['date'];
  if ('displayOrder' in values && !Number.isInteger(values['displayOrder'])) errors['order']=['number'];
  for (const [name, control] of Object.entries(form?.controls ?? {})) if (control.invalid && !required.includes(name)) errors[name] ??= ['invalid'];
  if (Object.keys(errors).length) form?.control.markAllAsTouched();
  return errors;
}

export function showEditorErrors(root: HTMLElement, errors: Record<string,string[]>, arabic: boolean, activate: (language:'en'|'ar')=>void): void {
  const managed=publishFieldErrors(root,errors);
  if(!managed) root.querySelectorAll('[data-editor-error]').forEach(node => node.remove());
  if(!managed) root.querySelectorAll('[aria-invalid="true"]').forEach(node => {node.removeAttribute('aria-invalid');node.removeAttribute('aria-describedby');});
  const fields = Array.from(root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('form [name]'));
  let first: HTMLElement | undefined;
  for (const [key, messages] of Object.entries(errors)) {
    const normalized = key.replace(/^\$?\.?/, '').split('.').pop()!.toLowerCase();
    const field = fields.find(node => node.name.toLowerCase()===normalized || (node.name==='shortEn' && normalized==='shortdescriptionen') || (node.name==='shortAr' && normalized==='shortdescriptionar'));
    if (!field) continue;
    if(!first || fields.indexOf(field)<fields.indexOf(first as HTMLInputElement)) first=field;
    if(managed) continue;
    const message = document.createElement('span'); message.dataset['editorError']='';
    message.id='editor-error-'+field.name; message.className='mt-1 block text-xs text-rose-200';
    message.textContent=messages[0]==='required' ? (arabic ? 'هذا الحقل مطلوب.' : 'This field is required.') : messages[0]==='length' ? (arabic ? 'القيمة تتجاوز الحد المسموح للحروف.' : 'This value exceeds the allowed character limit.') : messages[0]==='conflict' ? (arabic ? 'هذا الرابط مستخدم بالفعل.' : 'This slug is already in use.') : (arabic ? 'أدخل قيمة صحيحة لهذا الحقل.' : 'Enter a valid value for this field.');
    field.setAttribute('aria-invalid','true'); field.setAttribute('aria-describedby',message.id); field.insertAdjacentElement('afterend',message);
    if (!first || fields.indexOf(field)<fields.indexOf(first as HTMLInputElement)) first=field;
  }
  if (first) {
    const target=first; const language=target.closest('fieldset')?.getAttribute('lang');
    if (language==='en' || language==='ar') activate(language);
    queueMicrotask(() => {target.focus();target.scrollIntoView?.({block:'center',behavior:'smooth'});});
  }
}

export function localPublicationDate(value: string | null): string | null {
  if (!value) return null;
  const date=new Date(value);
  return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
