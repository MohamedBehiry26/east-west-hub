import { publicQuery, alternateQuery } from './public-query-state';
import { PublicCategory } from './public-content.models';

const categories: PublicCategory[] = [{ id: 'c', slug: 'production', alternateSlug: 'intaj', name: 'Production', description: null, imageUrl: null, displayOrder: 0 }];
describe('localized public query state', () => {
  it('keeps applicable search state and discards route-incompatible parameters', () => {
    expect(publicQuery('/ar/search', { q: ' production ', category: 'production', page: '2', secret: 'discard' })).toEqual({ q: 'production' });
    expect(publicQuery('/ar/services/production', { q: 'test', page: '2' })).toEqual({});
    expect(publicQuery('/en/projects', { q: 'test', page: '2', tag: 'tag' })).toEqual({ page: '2' });
  });
  it('preserves all supported watch filters and podcast query/pagination', () => {
    expect(publicQuery('/ar/watch', { q: 'فيديو', category: 'intaj', tag: 'creative', order: 'oldest', featured: 'true', page: '3' })).toEqual({ q: 'فيديو', category: 'intaj', tag: 'creative', order: 'oldest', featured: 'true', page: '3' });
    expect(publicQuery('/en/podcasts', { q: 'guest', page: '2', featured: 'true' })).toEqual({ q: 'guest', page: '2' });
  });
  it('rejects invalid, duplicated, oversized and out-of-range values', () => {
    expect(publicQuery('/en/watch', { q: ['one','two'], category: '../../admin', tag: 'has spaces', order: 'bogus', featured: 'yes', page: '-2' })).toEqual({});
    expect(publicQuery('/en/watch', { q: 'x'.repeat(201), page: '100001' })).toEqual({});
  });
  it('maps category slugs in both directions without requesting another catalog', () => {
    expect(alternateQuery('/ar/watch', { category: 'production', q: 'film' }, categories)).toEqual({ category: 'intaj', q: 'film' });
    expect(alternateQuery('/en/watch', { category: 'intaj' }, categories)).toEqual({ category: 'production' });
    expect(alternateQuery('/ar/watch', { category: 'unknown', page: '2' }, categories)).toEqual({ page: '2' });
    expect(alternateQuery('/ar/watch', { tag: 'creative' }, categories, [{slug:'creative',name:'Creative'}])).toEqual({ tag: 'creative' });
    expect(alternateQuery('/ar/watch', { tag: 'unknown' }, categories)).toEqual({});
  });
});
