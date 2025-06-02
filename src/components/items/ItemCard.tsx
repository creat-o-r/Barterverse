import Image from 'next/image';
import Link from 'next/link';
import type { Item } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

interface ItemCardProps {
  item: Item;
}

export default function ItemCard({ item }: ItemCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden h-full transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader className="p-0">
        <div className="aspect-[4/3] relative w-full">
          <Image
            src={item.imageUrl}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 ease-in-out group-hover:scale-105"
            data-ai-hint={item.dataAiHint || "item image"}
          />
           {item.status !== 'available' && (
            <Badge 
              variant={item.status === 'traded' ? 'destructive' : 'secondary'} 
              className="absolute top-2 right-2 capitalize"
            >
              {item.status}
            </Badge>
          )}
        </div>
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
