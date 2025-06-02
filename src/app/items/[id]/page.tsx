import Image from 'next/image';
import Link from 'next/link';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Star, UserCircle, Tag, Info, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ItemTradeInitiationContent from '@/components/items/ItemTradeInitiationContent';
import SuggestedMatches from '@/components/items/SuggestedMatches';
import { Separator } from '@/components/ui/separator';

// Helper function to find item and owner (simulates data fetching)
async function getItemDetails(itemId: string): Promise<{ item: Item; owner: User } | null> {
  const item = dummyItems.find((i) => i.id === itemId);
  if (!item) return null;
  const owner = dummyUsers.find((u) => u.id === item.ownerId);
  if (!owner) return null; // Should not happen with consistent dummy data
  return { item, owner };
}

export default async function ItemDetailPage({ params }: { params: { id: string } }) {
  const itemDetails = await getItemDetails(params.id);

  if (!itemDetails) {
    return <div className="text-center py-10 font-body">Item not found.</div>;
  }

  const { item, owner } = itemDetails;

  return (
    <>
      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="p-0">
              <div className="aspect-video relative w-full">
                <Image
                  src={item.imageUrl || 'https://placehold.co/800x450.png'}
                  alt={item.name}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={item.dataAiHint || "item image detail"}
                />
                {item.status !== 'available' && (
                  <Badge
                    variant={item.status === 'traded' ? 'destructive' : 'secondary'}
                    className="absolute top-4 right-4 text-lg p-2 capitalize"
                  >
                    {item.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <CardTitle className="text-3xl font-headline mb-2">{item.name}</CardTitle>
              <div className="flex items-center gap-2 mb-4">
                <Tag className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="text-sm">{item.category}</Badge>
              </div>
              <h3 className="font-headline text-xl mt-6 mb-2 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Description
              </h3>
              <p className="font-body text-foreground/80 leading-relaxed whitespace-pre-wrap">{item.description}</p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center gap-2">
                <UserCircle className="h-6 w-6 text-primary" />
                Owner Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={owner.avatarUrl} alt={owner.name} data-ai-hint={owner.dataAiHint || "owner avatar"} />
                  <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <Link href={`/profile/${owner.id}`} className="font-headline text-lg hover:text-primary">{owner.name}</Link>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star className="h-4 w-4 mr-1 text-yellow-400 fill-yellow-400" />
                    {owner.rating.toFixed(1)} ({owner.tradesCompleted} trades)
                  </div>
                </div>
              </div>
              {owner.bio && <p className="text-sm font-body text-muted-foreground italic">{owner.bio}</p>}
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                  <Link href={`/profile/${owner.id}`}>View Profile</Link>
              </Button>
            </CardFooter>
          </Card>

          {item.status === 'available' && (
            <Card>
              <CardHeader>
                  <CardTitle className="font-headline text-xl flex items-center gap-2">
                  <Repeat className="h-6 w-6 text-primary" />
                  Interested in this item?
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <ItemTradeInitiationContent item={item} ownerName={owner.name} ownerId={owner.id} />
              </CardContent>
            </Card>
          )}
          {item.status === 'pending' && (
              <Card className="border-yellow-500">
                  <CardHeader>
                      <CardTitle className="font-headline text-xl text-yellow-600">Trade Pending</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="font-body text-yellow-700">This item is currently part of a pending trade negotiation.</p>
                  </CardContent>
              </Card>
          )}
          {item.status === 'traded' && (
              <Card className="border-red-500">
                  <CardHeader>
                      <CardTitle className="font-headline text-xl text-red-600">Item Traded</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="font-body text-red-700">This item has already been traded.</p>
                  </CardContent>
              </Card>
          )}
        </div>
      </div>
      
      {item.status === 'available' && (
        <div className="mt-12">
          <Separator className="my-8" />
          <SuggestedMatches currentItem={item} />
        </div>
      )}
    </>
  );
}
