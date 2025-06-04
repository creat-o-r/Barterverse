
import Image from 'next/image';
import Link from 'next/link';
import type { Item } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Gift, Search, Link2, HeartHandshake } from 'lucide-react';
import type { AIMatchingMode } from '@/services/ai-config-service';

interface ItemCardProps {
  item: Item & { matchScore?: string; reciprocalItemId?: string };
  opportunityContextItemId?: string;
  usedMatchingMode?: AIMatchingMode;
  preferencesConsidered?: boolean;
}

function getMatchScoreColorStyles(score?: string): string {
  switch (score?.toLowerCase()) {
    case 'high': return 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200';
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200';
    case 'low': return 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200';
  }
}

export default function ItemCard({ item, opportunityContextItemId, usedMatchingMode, preferencesConsidered }: ItemCardProps) {
  const linkHref = `/items/${item.id}`;
  const matchScore = item.matchScore;

  let opportunityLink: string | null = null;
  if (opportunityContextItemId && !item.isGiftItForward) {
    const opportunityLinkParams = new URLSearchParams();
    opportunityLinkParams.set('mainItemId', opportunityContextItemId);
    opportunityLinkParams.set('suggestedItemId', item.id);
    if (matchScore) {
        opportunityLinkParams.set('score', matchScore);
    }
    if (item.reciprocalItemId) {
        opportunityLinkParams.set('reciprocalItemId', item.reciprocalItemId);
    }
    if (usedMatchingMode) {
        opportunityLinkParams.set('usedMatchingMode', usedMatchingMode);
    }
    if (preferencesConsidered !== undefined) {
        opportunityLinkParams.set('preferencesConsidered', String(preferencesConsidered));
    }
    opportunityLink = `/opportunities?${opportunityLinkParams.toString()}`;
  }

  return (
    <Card className="flex flex-col overflow-hidden h-full transition-all duration-300 ease-in-out hover:shadow-xl group">
      <CardHeader className="p-0 relative">
        <div className="aspect-[1/1] md:aspect-[4/3] relative w-full overflow-hidden">
          <Image
            src={item.imageUrl || `https://placehold.co/600x400.png?text=${item.listingType}`}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
            data-ai-hint={item.dataAiHint || "item image"}
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
           {item.status !== 'available' && (
            <Badge
              variant={item.status === 'traded' ? 'destructive' : 'secondary'}
              className="absolute top-2 right-2 capitalize z-10 text-xs"
            >
              {item.status}
            </Badge>
          )}
           {matchScore && (
             <Badge className={`absolute top-2 left-2 capitalize z-10 text-xs px-1.5 py-0.5 ${getMatchScoreColorStyles(matchScore)}`}>
              Match: {matchScore}
            </Badge>
          )}
          {item.listingType === 'offer' && item.isGiftItForward && (
            <Badge variant="default" className="absolute bottom-2 right-2 capitalize z-10 text-[10px] md:text-xs bg-pink-500 hover:bg-pink-600 text-white">
              <HeartHandshake className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" /> Gift
            </Badge>
           )}
           {!matchScore && !(item.listingType === 'offer' && item.isGiftItForward) && ( 
            <Badge
                variant={item.listingType === 'offer' ? 'default' : 'secondary'}
                className={`absolute bottom-2 left-2 capitalize z-10 text-[10px] md:text-xs ${item.listingType === 'offer' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
                {item.listingType === 'offer' ? <Gift className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" /> : <Search className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />}
                {item.listingType}
            </Badge>
           )}
        </div>
      </CardHeader>
      <CardContent className="p-2 md:p-4 flex-grow">
        <CardTitle className="text-sm md:text-lg font-headline mb-1 md:mb-2 leading-tight line-clamp-2">
          <Link href={linkHref} className="hover:text-primary transition-colors">
            {item.name}
          </Link>
        </CardTitle>
        <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 font-body mb-1 md:mb-2">
          {item.description}
        </p>
        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 md:text-xs md:px-2.5 md:py-0.5">{item.category}</Badge>
        </div>
      </CardContent>
      <CardFooter className="p-2 md:p-4 border-t flex flex-col items-stretch gap-2">
        <Button asChild variant="default" className="w-full bg-primary hover:bg-primary/90 h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm">
          <Link href={linkHref} className="flex items-center gap-1 md:gap-2">
            <Eye className="h-3.5 w-3.5 md:h-4 md:w-4" />
            View Details
          </Link>
        </Button>
        {opportunityLink && (
          <Button asChild variant="outline" size="sm" className="w-full h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm">
            <Link href={opportunityLink} className="flex items-center gap-1 md:gap-2">
              <Link2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
              View Opportunity
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
