/**
 * Image Placeholder & Asset Configuration Architecture
 * Defines standard aspect ratios, dimensions, and fallbacks
 * allowing asset substitution without modifying component layout.
 */

export interface ImageSlotConfig {
  slot: string;
  label: string;
  width: number;
  height: number;
  aspectRatio: string;
  placeholderUrl: string;
}

export const IMAGE_CONFIG: Record<string, ImageSlotConfig> = {
  // Hero Illustrations
  heroSemanticVector: {
    slot: 'heroSemanticVector',
    label: 'Hero Semantic Vector Matching Illustration',
    width: 600,
    height: 480,
    aspectRatio: '5:4',
    placeholderUrl: '/images/hero-vector-matching.svg',
  },

  // Company Brand Logos
  companyDevOpsCloud: {
    slot: 'companyDevOpsCloud',
    label: 'DevOpsCloud LLC Logo',
    width: 64,
    height: 64,
    aspectRatio: '1:1',
    placeholderUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=128&auto=format&fit=crop&q=80',
  },
  companySecurTech: {
    slot: 'companySecurTech',
    label: 'SecurTech Labs Logo',
    width: 64,
    height: 64,
    aspectRatio: '1:1',
    placeholderUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
  },
  companyCloudScale: {
    slot: 'companyCloudScale',
    label: 'CloudScale Systems Logo',
    width: 64,
    height: 64,
    aspectRatio: '1:1',
    placeholderUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
  },
  companyFptSoftware: {
    slot: 'companyFptSoftware',
    label: 'FPT Software Corporation Logo',
    width: 64,
    height: 64,
    aspectRatio: '1:1',
    placeholderUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=128&auto=format&fit=crop&q=80',
  },

  // Avatars
  avatarAndrewSterling: {
    slot: 'avatarAndrewSterling',
    label: 'Andrew Sterling Candidate Avatar',
    width: 80,
    height: 80,
    aspectRatio: '1:1',
    placeholderUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80',
  },
  avatarSarahJenkins: {
    slot: 'avatarSarahJenkins',
    label: 'Sarah Jenkins Recruiter Avatar',
    width: 80,
    height: 80,
    aspectRatio: '1:1',
    placeholderUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&auto=format&fit=crop&q=80',
  },
  // Auth Hero Image Slot (MatchJD Editorial Split Layout)
  IMAGE_PLACEHOLDER_AUTH_HERO: {
    slot: 'IMAGE_PLACEHOLDER_AUTH_HERO',
    label: 'MatchJD Authentication Split Hero Image',
    width: 1920,
    height: 1280,
    aspectRatio: '3:2',
    placeholderUrl: '', // Default empty string to render vector geometric placeholder; can accept real URL
  },
};

export function getImageSlot(slotName: keyof typeof IMAGE_CONFIG): ImageSlotConfig {
  return IMAGE_CONFIG[slotName] || {
    slot: 'fallback',
    label: 'Fallback Image',
    width: 200,
    height: 200,
    aspectRatio: '1:1',
    placeholderUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160&auto=format&fit=crop&q=80',
  };
}
