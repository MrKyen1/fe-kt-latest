export interface HomepageSlideMedia {
  id: string;
  url: string;
  mimeType?: string;
  altText?: string;
}

export interface HomepageSlide {
  id: string;
  mediaId: string;
  media?: HomepageSlideMedia;
  altText?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaLink?: string;
  orderIndex: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AboutStat {
  label: string;
  value: string;
}

export interface HomepageAboutMedia {
  id: string;
  url: string;
  mimeType?: string;
  altText?: string;
}

export interface HomepageAbout {
  title: string;
  description: string;
  mission: string;
  vision: string;
  stats: AboutStat[];
  image?: HomepageAboutMedia | null;
}

export interface FacilityHighlight {
  title: string;
  description: string;
}

export interface HomepageGalleryItem {
  id: string;
  mediaId: string;
  media?: {
    id?: string;
    url: string;
    mimeType?: string;
    altText?: string;
  };
  altText?: string;
  orderIndex: number;
  isActive: boolean;
}

export interface HomepageFacilities {
  title: string;
  description: string;
  highlights: FacilityHighlight[];
  gallery: HomepageGalleryItem[];
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface HomepageFooter {
  brandName: string;
  description: string;
  socialLinks: SocialLink[];
  phone: string;
  email: string;
  copyright: string;
}

export interface HomepageData {
  slider: HomepageSlide[];
  about: HomepageAbout;
  facilities: HomepageFacilities;
  footer: HomepageFooter;
}

export interface HomepageMedia {
  id: string;
  url: string;
  mimeType: string;
  altText?: string;
  createdAt?: string;
}

export interface UpdateHomepageSettingsPayload {
  aboutTitle?: string;
  aboutDescription?: string;
  aboutMission?: string;
  aboutVision?: string;
  aboutStats?: AboutStat[];
  aboutMediaId?: string | null;
  facilitiesTitle?: string;
  facilitiesDescription?: string;
  facilitiesHighlights?: FacilityHighlight[];
  footerBrandName?: string;
  footerDescription?: string;
  footerSocialLinks?: SocialLink[];
  footerPhone?: string;
  footerEmail?: string;
  footerCopyright?: string;
}

export interface CreateSlidePayload {
  mediaId: string;
  altText?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaLink?: string;
  orderIndex?: number;
  isActive?: boolean;
}

export interface UpdateSlidePayload {
  mediaId?: string;
  altText?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaLink?: string;
  orderIndex?: number;
  isActive?: boolean;
}

export interface CreateGalleryPayload {
  mediaId: string;
  altText?: string;
  orderIndex?: number;
  isActive?: boolean;
}

export interface UpdateGalleryPayload {
  mediaId?: string;
  altText?: string;
  orderIndex?: number;
  isActive?: boolean;
}

export interface ReorderItem {
  id: string;
  orderIndex: number;
}

export interface HomepageTeacher {
  id: string;
  fullName: string;
  avatar?: string | null;
  description?: string | null;
  yearsOfExperience?: number | null;
  specializations: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  centers: Array<{
    id: string;
    name: string;
  }>;
}
