import { ActivatedRoute, Params, Router } from '@angular/router';
import { PublicCategory, PublicTag } from './public-content.models';

/** Only list/search controls understood by the destination route are transferable. */
export function publicQuery(path: string, values: Params): Record<string, string> {
  const section = path.replace(/^\/(en|ar)\/?/, '').split(/[?#]/)[0];
  const result: Record<string, string> = {};
  const text = (key: string) => typeof values[key] === 'string' ? values[key].trim() : '';
  if (['search', 'watch', 'podcasts'].includes(section)) {
    const q = text('q'); if (q && q.length <= 200) result['q'] = q;
  }
  if (section === 'watch') {
    for (const key of ['category', 'tag']) {
      const value = text(key); if (value && value.length <= 160 && /^[\p{L}\p{N}_-]+$/u.test(value)) result[key] = value;
    }
    if (['featured', 'latest', 'oldest'].includes(text('order'))) result['order'] = text('order');
    if (text('featured') === 'true') result['featured'] = 'true';
  }
  if (['watch', 'podcasts', 'services', 'projects', 'insights'].includes(section)) {
    const page = String(values['page'] ?? '');
    if (/^[1-9]\d*$/.test(page) && Number(page) <= 100000) result['page'] = page;
  }
  return result;
}

export function alternateQuery(path: string, values: Params, categories: PublicCategory[], tags: PublicTag[] = []): Record<string, string> {
  const result = publicQuery(path, values);
  if (result['category']) {
    const category = categories.find(item => item.slug === result['category'] || item.alternateSlug === result['category']);
    if (category) result['category'] = category.slug === result['category'] ? category.alternateSlug : category.slug;
    else delete result['category']; // Unknown category must not become a wrong-language filter.
  }
  if (result['tag'] && !tags.some(tag => tag.slug === result['tag'])) delete result['tag'];
  return result;
}

/** Replace filter edits in history; route/language navigation still creates history entries. */
export function syncPublicQuery(router: Router, route: ActivatedRoute, params: Record<string, string>): boolean {
  if (!route.queryParamMap) return false;
  const current = route.snapshot.queryParamMap;
  if (current.keys.length === Object.keys(params).length && current.keys.every(key => current.getAll(key).length === 1 && current.get(key) === params[key])) return false;
  void router.navigate([], { relativeTo: route, queryParams: params, replaceUrl: true });
  return true;
}
