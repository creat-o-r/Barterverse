
import Image from 'next/image';
import Link from 'next/link';
import type { Item } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Gift, Search, Link2 as LinkIcon, HeartHandshake } from 'lucide-react';
// import type { AIMatchingMode } from '@/services/ai-config-service'; // Simplified
// import { cn } from '@/lib/utils'; // Not used in simplified version

interface ItemCardProps {
  item: Item; // Using the Item type from @/types
}

// Removed getMatchScoreColorStyles as matchScore is not used in this simplified version

export default function ItemCard({ item }: ItemCardProps) {
  const itemDetailLink = `/items/${item.id}`;

  // Simplified HeaderContent without matchScore and opportunityLink logic
  const HeaderContent = (
    <CardHeader className="p-0 relative">
      <div className="aspect-[1/1] md:aspect-[4/3] relative w-full overflow-hidden">
        <Image
          src={item.imageUrl || 'https://placehold.co/600x400.png'}
          alt={item.title} // Changed item.name to item.title
          fill
          className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
          data-ai-hint={item.dataAiHint || "item image"} // Kept dataAiHint if it's in Item type
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {item.status !== 'available' && (
          <Badge
            variant={item.status === 'traded' ? 'destructive' : 'secondary'}
            className="absolute top-1.5 right-1.5 capitalize z-10 text-[9px] px-1 py-0 md:text-xs md:top-2 md:right-2"
          >
            {item.status}
          </Badge>
        )}
         {/* Simplified: Display listing type badge, and GiftItForward if applicable */}
        <Badge
            variant={item.listingType === 'offer' ? 'default' : 'secondary'}
            className={`absolute bottom-1.5 left-1.5 capitalize z-10 text-[9px] px-1 py-0 md:text-xs md:bottom-2 md:left-2 ${item.listingType === 'offer' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {item.listingType === 'offer' ? <Gift className="h-2 w-2 md:h-2.5 md:w-2.5 mr-0.5 md:mr-1" /> : <Search className="h-2 w-2 md:h-2.5 md:w-2.5 mr-0.5 md:mr-1" />}
            {item.listingType}
        </Badge>
        {item.listingType === 'offer' && item.isGiftItForward && (
          <Badge variant="default" className="absolute bottom-1.5 right-1.5 capitalize z-10 text-[9px] px-1 py-0 md:text-xs md:bottom-2 md:right-2 bg-pink-500 hover:bg-pink-600 text-white">
            <HeartHandshake className="h-2 w-2 md:h-2.5 md:w-2.5 mr-0.5 md:mr-1" /> Gift
          </Badge>
        )}
      </div>
    </CardHeader>
  );

  return (
    <Card className="flex flex-col overflow-hidden h-full transition-all duration-300 ease-in-out hover:shadow-xl group">
      {/* Removed opportunityLink logic for wrapper */}
      {HeaderContent}
      <CardContent className="p-1.5 md:p-3 flex-grow">
        <CardTitle className="text-xs sm:text-sm md:text-base font-headline mb-0.5 md:mb-1 leading-tight line-clamp-2">
          <Link href={itemDetailLink} className="hover:text-primary transition-colors">
            {item.title} {/* Changed item.name to item.title */}
          </Link>
        </CardTitle>
        <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground line-clamp-2 font-body mb-0.5 md:mb-1">
          {item.description}
        </p>
        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
            <Badge variant="outline" className="text-[9px] px-1 py-0 md:text-xs md:px-2 md:py-0.5">{item.category}</Badge>
             {/* Display owner name, simplified */}
            <p className="text-[9px] md:text-xs text-muted-foreground line-clamp-1">
              By: {item.ownerName || 'Anonymous'}
            </p>
        </div>
      </CardContent>
      <CardFooter className="p-1.5 md:p-3 border-t flex flex-col items-stretch gap-1.5 md:gap-2">
        <Button asChild variant="default" className="w-full bg-primary hover:bg-primary/90 h-7 px-2 text-[10px] md:h-8 md:text-xs md:px-3">
          <Link href={itemDetailLink} className="flex items-center gap-1 md:gap-1.5">
            <Eye className="h-3 w-3 md:h-3.5 md:w-3.5" />
            View Item
          </Link>
        </Button>
        {/* Removed opportunityLink button */}
      </CardFooter>
    </Card>
  );
}
