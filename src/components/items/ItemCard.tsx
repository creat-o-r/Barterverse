
import Image from 'next/image';
import Link from 'next/link';
import type { Item } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Gift, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ItemCardProps {
  item: Item & { matchScore?: string };
}

function getMatchScoreColor(score?: string) {
  switch (score?.toLowerCase()) {
    case 'high': return 'bg-green-600 hover:bg-green-700 text-white';
    case 'medium': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
    case 'low': return 'bg-red-500 hover:bg-red-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
}

function getMatchScoreIcon(score?: string) {
  switch (score?.toLowerCase()) {
    case 'high': return <TrendingUp className="h-3 w-3 mr-1" />;
    case 'medium': return <Minus className="h-3 w-3 mr-1" />;
    case 'low': return <TrendingDown className="h-3 w-3 mr-1" />;
    default: return null;
  }
}


export default function ItemCard({ item }: ItemCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden h-full transition-all duration-300 ease-in-out hover:shadow-xl group">
      <CardHeader className="p-0 relative">
        <div className="aspect-[4/3] relative w-full overflow-hidden">
          <Image
            src={item.imageUrl || `https://placehold.co/600x400.png?text=${item.listingType}`}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 ease-in-out group-hover:scale-105"
            data-ai-hint={item.dataAiHint || "item image"}
          />
           {item.status !== 'available' && (
            <Badge
              variant={item.status === 'traded' ? 'destructive' : 'secondary'}
              className="absolute top-2 right-2 capitalize z-10 text-xs"
            >
              {item.status}
            </Badge>
          )}
           {item.matchScore && (
            <Badge
              className={`absolute top-2 left-2 capitalize z-10 text-xs flex items-center ${getMatchScoreColor(item.matchScore)}`}
            >
              {getMatchScoreIcon(item.matchScore)}
              Match: {item.matchScore}
            </Badge>
          )}
        </div>
        <Badge
            variant={item.listingType === 'offer' ? 'default' : 'secondary'}
            className={`absolute bottom-2 left-2 capitalize z-10 text-xs ${item.listingType === 'offer' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
            {item.listingType === 'offer' ? <Gift className="h-3 w-3 mr-1" /> : <Search className="h-3 w-3 mr-1" />}
            {item.listingType}
        </Badge>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-headline mb-2 leading-tight">
          <Link href={`/items/${item.id}`} className="hover:text-primary transition-colors">
            {item.name}
          </Link>
        </CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2 font-body mb-1">
          {item.description}
        </p>
        <Badge variant="outline" className="text-xs">{item.category}</Badge>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Button asChild variant="default" size="sm" className="w-full bg-primary hover:bg-primary/90">
          <Link href={`/items/${item.id}`} className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
