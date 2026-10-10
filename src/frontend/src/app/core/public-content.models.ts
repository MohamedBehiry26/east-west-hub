export interface PublicPage<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface PublicCategory {
  id: string;
  slug: string;
  alternateSlug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
}

export interface PublicTag { slug: string; name: string; }

export interface PublicVideo {
  id: string;
  slug: string;
  alternateSlug: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  youTubeVideoId: string | null;
  publishedAt: string | null;
  duration: string | null;
  isFeatured: boolean;
  category: PublicCategory;
  tags: string[];
  contentType: 'video' | 'podcast' | 'program' | 'interview' | 'campaign' | 'documentary' | 'originalContent' | 'event' | 'brandedContent' | 'other';
  episodeNumber: number | null;
  seasonNumber: number | null;
  guestName: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface PublicService {
  id: string;
  slug: string;
  alternateSlug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  features: string | null;
  process: string | null;
  imageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  displayOrder: number;
  relatedProjects: { id: string; slug: string; title: string; coverImageUrl: string | null }[];
}

export interface PublicPortfolioImage {
  imageUrl: string;
  altText: string | null;
  displayOrder: number;
}

export interface PublicPortfolioProject {
  id: string;
  slug: string;
  alternateSlug: string;
  title: string;
  client: string | null;
  category: string | null;
  description: string | null;
  challenge: string | null;
  approach: string | null;
  solution: string | null;
  results: string | null;
  coverImageUrl: string | null;
  projectDate: string | null;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  images: PublicPortfolioImage[];
  servicesUsed: string[];
}

export interface PublicArticle {
  id: string;
  slug: string;
  alternateSlug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  coverImageUrl: string | null;
  authorName: string;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface PublicSiteSettings {
  heroYouTubeVideoId?: string | null;
  agencyName: string;
  agencyDescription: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  socialLinks: { platform: string; url: string }[];
}
