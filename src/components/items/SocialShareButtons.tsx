import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Facebook, Twitter, MessageCircle, Linkedin, Pinterest, Reddit, Send, Mail,
  ChevronDown, ChevronUp, Smartphone, Copy, CheckCircle2
} from 'lucide-react';

// --- localStorage Helpers ---
export const LOCAL_STORAGE_KEY = 'socialShareUsageCounts';
export const NUM_PRIMARY_BUTTONS = 3;
// These IDs must match the `id` field in platform configurations
export const DEFAULT_PRIMARY_PLATFORM_IDS = ['facebook', 'twitter', 'whatsapp'];

interface UsageCounts {
  [platformId: string]: number;
}

const getUsageCounts = (): UsageCounts => {
  if (typeof window === 'undefined') return {};
  try {
    const counts = localStorage.getItem(LOCAL_STORAGE_KEY);
    return counts ? JSON.parse(counts) : {};
  } catch (error) {
    console.error("Error reading usage counts from localStorage:", error);
    return {};
  }
};

const incrementUsageCount = (platformId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const counts = getUsageCounts();
    counts[platformId] = (counts[platformId] || 0) + 1;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(counts));
  } catch (error) {
    console.error("Error updating usage counts in localStorage:", error);
  }
};

// --- Component ---
interface SocialShareButtonsProps {
  itemUrl: string;
  itemName: string;
  itemImageUrl?: string;
}

// --- Platform Types ---
type PlatformID = 'facebook' | 'twitter' | 'whatsapp' | 'linkedin' | 'pinterest' | 'reddit' | 'telegram' | 'email' | 'signal' | 'copyLink';

interface BasePlatform {
  id: PlatformID;
  name: string;
  icon: JSX.Element;
  ariaLabel: string;
  title: string;
  disabled?: boolean;
}

interface DirectLinkPlatform extends BasePlatform {
  url: string;
  actionType: 'link';
}

interface CustomActionPlatform extends BasePlatform {
  customAction: () => void;
  actionType: 'custom';
}

type Platform = DirectLinkPlatform | CustomActionPlatform;


const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({ itemUrl, itemName, itemImageUrl }) => {
  const [showMore, setShowMore] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [dynamicPrimaryPlatforms, setDynamicPrimaryPlatforms] = useState<Platform[]>([]);
  const [dynamicSecondaryPlatforms, setDynamicSecondaryPlatforms] = useState<Platform[]>([]);

  const encodedItemUrl = useMemo(() => encodeURIComponent(itemUrl), [itemUrl]);
  const encodedItemName = useMemo(() => encodeURIComponent(itemName), [itemName]);
  const encodedItemImageUrl = useMemo(() => itemImageUrl ? encodeURIComponent(itemImageUrl) : '', [itemImageUrl]);

  const handleCopyLink = useCallback(() => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(itemUrl)
        .then(() => {
          setLinkCopied(true);
          setTimeout(() => setLinkCopied(false), 2500);
        })
        .catch(err => console.error('Failed to copy item link: ', err));
    } else {
      console.warn('Clipboard API not available.');
    }
  }, [itemUrl]);

  const allPlatformsMasterList = useMemo<Platform[]>(() => [
    {
      id: 'facebook', name: 'Facebook', icon: <Facebook className="h-5 w-5" />,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedItemUrl}`,
      ariaLabel: 'Share on Facebook', title: 'Share on Facebook', actionType: 'link',
    },
    {
      id: 'twitter', name: 'Twitter', icon: <Twitter className="h-5 w-5" />,
      url: `https://twitter.com/intent/tweet?url=${encodedItemUrl}&text=${encodedItemName}`,
      ariaLabel: 'Share on Twitter', title: 'Share on Twitter', actionType: 'link',
    },
    {
      id: 'whatsapp', name: 'WhatsApp', icon: <MessageCircle className="h-5 w-5" />,
      url: `https://api.whatsapp.com/send?text=${encodedItemName}%20${encodedItemUrl}`,
      ariaLabel: 'Share on WhatsApp', title: 'Share on WhatsApp', actionType: 'link',
    },
    {
      id: 'linkedin', name: 'LinkedIn', icon: <Linkedin className="h-5 w-5" />,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedItemUrl}`,
      ariaLabel: 'Share on LinkedIn', title: 'Share on LinkedIn', actionType: 'link',
    },
    {
      id: 'pinterest', name: 'Pinterest', icon: <Pinterest className="h-5 w-5" />,
      url: encodedItemImageUrl
        ? `https://pinterest.com/pin/create/button/?url=${encodedItemUrl}&media=${encodedItemImageUrl}&description=${encodedItemName}`
        : `https://pinterest.com/pin/create/button/?url=${encodedItemUrl}&description=${encodedItemName}`,
      ariaLabel: 'Share on Pinterest', title: 'Share on Pinterest', actionType: 'link',
    },
    {
      id: 'reddit', name: 'Reddit', icon: <Reddit className="h-5 w-5" />,
      url: `https://www.reddit.com/submit?url=${encodedItemUrl}&title=${encodedItemName}`,
      ariaLabel: 'Share on Reddit', title: 'Share on Reddit', actionType: 'link',
    },
    {
      id: 'telegram', name: 'Telegram', icon: <Send className="h-5 w-5" />,
      url: `https://t.me/share/url?url=${encodedItemUrl}&text=${encodedItemName}`,
      ariaLabel: 'Share on Telegram', title: 'Share on Telegram', actionType: 'link',
    },
    {
      id: 'email', name: 'Email', icon: <Mail className="h-5 w-5" />,
      url: `mailto:?subject=${encodedItemName}&body=${encodedItemName}%0A${encodedItemUrl}`,
      ariaLabel: 'Share via Email', title: 'Share via Email', actionType: 'link',
    },
    {
      id: 'signal', name: 'Signal', icon: <Smartphone className="h-5 w-5" />,
      url: `signal://send?text=${encodedItemName}%20${encodedItemUrl}`,
      ariaLabel: 'Share on Signal', title: 'Share on Signal', actionType: 'link',
    },
    {
      id: 'copyLink', name: 'Copy Link',
      icon: linkCopied ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />,
      ariaLabel: linkCopied ? 'Link Copied!' : 'Copy item link',
      title: linkCopied ? 'Link Copied!' : 'Copy item link',
      customAction: handleCopyLink, actionType: 'custom',
      disabled: linkCopied,
    },
  ], [encodedItemUrl, encodedItemName, encodedItemImageUrl, linkCopied, handleCopyLink]);


  useEffect(() => {
    const counts = getUsageCounts();

    // Sort ALL platforms by usage, then name
    const sortedAllPlatforms = [...allPlatformsMasterList].sort((a, b) => {
      const countA = counts[a.id] || 0;
      const countB = counts[b.id] || 0;
      if (countA !== countB) return countB - countA;
      return a.name.localeCompare(b.name);
    });

    let determinedPrimary: Platform[] = [];
    let determinedSecondary: Platform[];

    const hasSignificantUsage = Object.values(counts).some(count => count > 0);

    if (hasSignificantUsage) {
      determinedPrimary = sortedAllPlatforms.slice(0, NUM_PRIMARY_BUTTONS);
      determinedSecondary = sortedAllPlatforms.slice(NUM_PRIMARY_BUTTONS);
    } else {
      // Default mode (no significant usage)
      const defaultPrimarySet = new Set<PlatformID>();
      // Populate with defaults first, ensuring they exist in sortedAllPlatforms (which they should)
      for (const id of DEFAULT_PRIMARY_PLATFORM_IDS) {
        if (determinedPrimary.length < NUM_PRIMARY_BUTTONS) {
          const platform = sortedAllPlatforms.find(p => p.id === id);
          if (platform) {
            determinedPrimary.push(platform);
            defaultPrimarySet.add(id);
          }
        }
      }
      // Fill remaining primary slots if any, from sortedAllPlatforms (already sorted by name if counts are 0)
      let i = 0;
      while (determinedPrimary.length < NUM_PRIMARY_BUTTONS && i < sortedAllPlatforms.length) {
        const platform = sortedAllPlatforms[i];
        if (!defaultPrimarySet.has(platform.id)) { // Avoid adding if it was already a default or added
            if (!determinedPrimary.find(p => p.id === platform.id)) { // Check if not already added
                 determinedPrimary.push(platform);
            }
        }
        i++;
      }
      const primaryIds = new Set(determinedPrimary.map(p => p.id));
      determinedSecondary = sortedAllPlatforms.filter(p => !primaryIds.has(p.id));
    }

    // Special handling for Copy Link: if it's in secondary, move to front.
    const copyLinkPlatform = allPlatformsMasterList.find(p => p.id === 'copyLink');
    if (copyLinkPlatform) {
        const isCopyLinkPrimary = determinedPrimary.some(p => p.id === 'copyLink');
        if (!isCopyLinkPrimary) {
            determinedSecondary = determinedSecondary.filter(p => p.id !== 'copyLink');
            determinedSecondary.unshift(copyLinkPlatform);
        }
    }

    setDynamicPrimaryPlatforms(determinedPrimary);
    setDynamicSecondaryPlatforms(determinedSecondary);

  }, [allPlatformsMasterList]); // Re-run when master list changes (e.g. linkCopied state)

  const createTrackedAction = useCallback((platform: Platform): (() => void) => {
    return () => {
      incrementUsageCount(platform.id);
      if (platform.actionType === 'link') {
        window.open(platform.url, '_blank', 'noopener,noreferrer');
      } else if (platform.actionType === 'custom') {
        platform.customAction();
      }
    };
  }, []);


  return (
    <div className="my-4">
      <div className="flex items-center space-x-2">
        <p className="text-sm font-medium text-muted-foreground">Share:</p>
        {dynamicPrimaryPlatforms.map((platform) => (
          <Button
            key={platform.id}
            variant="outline"
            size="icon"
            onClick={createTrackedAction(platform)}
            aria-label={platform.ariaLabel}
            title={platform.title}
            disabled={platform.disabled}
          >
            {platform.icon}
          </Button>
        ))}
        {dynamicSecondaryPlatforms.length > 0 && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowMore(!showMore)}
            aria-label={showMore ? 'Show less sharing options' : 'Show more sharing options'}
            title={showMore ? 'Show less sharing options' : 'Show more sharing options'}
          >
            {showMore ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        )}
      </div>
      {showMore && dynamicSecondaryPlatforms.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {dynamicSecondaryPlatforms.map((platform) => (
            <Button
              key={platform.id}
              variant="outline"
              size="icon"
              onClick={createTrackedAction(platform)}
              aria-label={platform.ariaLabel}
              title={platform.title}
              disabled={platform.disabled}
            >
              {platform.icon}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialShareButtons;
