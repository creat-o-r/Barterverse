
import { use, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Star, UserCircle, Tag, Info, Repeat, Gift, Search, Link2 as LinkIcon, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ItemTradeInitiationContent from '@/components/items/ItemTradeInitiationContent';
import SuggestedMatches from '@/components/items/SuggestedMatches';
import TemporaryAdminMatchTestPanelClient from '@/components/items/TemporaryAdminMatchTestPanelClient';
import { Separator } from '@/components/ui/separator';

async function getItemDetails(itemId: string): Promise<{ item: Item; owner: User } | null> {
  // console.log(`[ItemDetailsDisplay] getItemDetails called for ID: ${itemId}`);
  // Simulate network delay if needed for testing suspense
  // await new Promise(resolve => setTimeout(resolve, 500)); 
  const item = dummyItems.find((i) => i.id === itemId);
  if (!item) {
    console.error(`[ItemDetailsDisplay] getItemDetails: Item not found for ID: ${itemId}`);
    return null;
  }
  const owner = dummyUsers.find((u) => u.id === item.ownerId);
  if (!owner) {
    console.error(`[ItemDetailsDisplay] getItemDetails: Owner not found for item ID: ${itemId}, owner ID: ${item.ownerId}`);
    return null;
  }
  // console.log(`[ItemDetailsDisplay] getItemDetails: Found item "${item.name}" and owner "${owner.name}"`);
  return { item, owner };
}

async function ItemDetailsDisplay({ itemId }: { itemId: string }) {
  // console.log(`[ItemDetailsDisplay] Rendering for itemId: ${itemId}`);
  const itemDetails = await getItemDetails(itemId);

  if (!itemDetails) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader><CardTitle className="text-center font-headline">Item Not Found</CardTitle></CardHeader>
          <CardContent><p className="text-center font-body">Could not find an item with ID: {itemId}</p></CardContent>
        </Card>
      </div>
    );
  }

  const { item, owner } = itemDetails;
  const currentUserId = dummyUsers[0]?.id || 'user1_fallback';
  const isCurrentUserOwner = item.ownerId === currentUserId;

  // console.log(`[ItemDetailsDisplay] Successfully fetched and rendering item: ${item.name}`);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Card className="overflow-hidden shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative aspect-square md:aspect-auto min-h-[300px] md:min-h-0">
            <Image
              src={item.imageUrl || 'https://placehold.co/600x400.png'}
              alt={item.name}
              fill
              className="object-cover"
              data-ai-hint={item.dataAiHint || "item image"}
              priority // Prioritize loading the main item image
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          <div className="p-6 flex flex-col">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-headline text-3xl mb-2">{item.name}</CardTitle>
              <div className="flex items-center gap-2 mb-1">
                <Tag className="h-5 w-5 text-primary" />
                <Badge variant="secondary" className="text-sm">{item.category}</Badge>
              </div>
              <Badge
                variant={item.listingType === 'offer' ? 'default' : 'secondary'}
                className={`capitalize text-xs w-fit ${item.listingType === 'offer' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {item.listingType === 'offer' ? <Gift className="mr-1 h-3 w-3" /> : <Search className="mr-1 h-3 w-3" />}
                {item.listingType}
              </Badge>
            </CardHeader>

            <CardContent className="p-0 flex-grow">
              <p className="font-body text-foreground/80 leading-relaxed whitespace-pre-wrap mb-4">{item.description}</p>
              <Separator className="my-4" />
              <div className="space-y-3">
                <h3 className="font-headline text-xl flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary" />Owner Details</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={owner.avatarUrl} alt={owner.name} data-ai-hint={owner.dataAiHint || "owner avatar"} />
                    <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link href={`/profile/${owner.id}`} className="font-semibold text-primary hover:underline">{owner.name}</Link>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-4 w-4 mr-1 text-yellow-400 fill-yellow-400" /> {owner.rating.toFixed(1)} ({owner.tradesCompleted} trades)
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="p-0 pt-6">
              {!isCurrentUserOwner && item.status === 'available' && (
                <ItemTradeInitiationContent item={item} ownerName={owner.name} ownerId={owner.id} />
              )}
              {isCurrentUserOwner && item.status === 'available' && (
                <Button variant="outline" className="w-full">Manage Your Listing</Button>
              )}
              {item.status === 'traded' && <Badge variant="destructive" className="w-full text-center py-2 text-sm">Item Traded</Badge>}
              {item.status === 'pending' && <Badge variant="secondary" className="w-full text-center py-2 text-sm">Trade Pending</Badge>}
            </CardFooter>
          </div>
        </div>
      </Card>

      {!isCurrentUserOwner && item.status === 'available' && (
        <Suspense fallback={<SuggestedMatchesLoadingState />}>
          <SuggestedMatches currentItem={item} />
        </Suspense>
      )}
      <TemporaryAdminMatchTestPanelClient itemToTest={item} />
    </div>
  );
}

function ItemPageLoadingState() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8 animate-pulse">
      <Card className="overflow-hidden shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative aspect-square md:aspect-auto min-h-[300px] md:min-h-0 bg-muted rounded"></div>
          <div className="p-6 flex flex-col">
            <CardHeader className="p-0 pb-4">
              <div className="h-8 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 bg-muted-foreground/20 rounded-full"></div>
                <div className="h-6 bg-muted-foreground/20 rounded w-1/3"></div>
              </div>
              <div className="h-5 bg-muted-foreground/20 rounded w-1/4"></div>
            </CardHeader>
            <CardContent className="p-0 flex-grow">
              <div className="h-4 bg-muted-foreground/20 rounded w-full mb-2"></div>
              <div className="h-4 bg-muted-foreground/20 rounded w-full mb-2"></div>
              <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-4"></div>
              <Separator className="my-4" />
              <div className="h-6 bg-muted-foreground/20 rounded w-1/3 mb-3"></div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted-foreground/20"></div>
                <div>
                  <div className="h-5 bg-muted-foreground/20 rounded w-24 mb-1"></div>
                  <div className="h-4 bg-muted-foreground/20 rounded w-32"></div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-0 pt-6">
              <div className="h-10 bg-muted-foreground/20 rounded w-full"></div>
            </CardFooter>
          </div>
        </div>
      </Card>
      {/* Placeholder for SuggestedMatches loading */}
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-7 bg-muted-foreground/20 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col overflow-hidden h-full bg-muted/50 rounded-lg border border-muted-foreground/10">
                <div className="aspect-[4/3] bg-muted-foreground/20"></div>
                <div className="p-4 flex-grow space-y-2">
                  <div className="h-5 bg-muted-foreground/20 rounded w-3/4"></div>
                  <div className="h-4 bg-muted-foreground/20 rounded w-full"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SuggestedMatchesLoadingState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
          Loading Suggested Matches...
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex flex-col overflow-hidden h-full bg-muted/50 animate-pulse border border-border">
              <div className="aspect-[4/3] bg-muted"></div>
              <CardContent className="p-4 flex-grow space-y-2">
                <div className="h-5 bg-muted-foreground/20 rounded w-3/4"></div>
                <div className="h-4 bg-muted-foreground/20 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ItemDetailPageWrapper({ params: paramsProp }: { params: { id: string } }) {
  // console.log('[ItemDetailPageWrapper] Received paramsProp:', paramsProp);
  const params = use(paramsProp);
  // console.log('[ItemDetailPageWrapper] Resolved params by `use`:', params);

  if (!params || !params.id) {
    // console.error('[ItemDetailPageWrapper] Params or params.id is missing.');
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive font-headline">Error: Missing Item ID</CardTitle></CardHeader>
          <CardContent><p className="font-body">The item ID was not provided in the request.</p></CardContent>
        </Card>
      </div>
    );
  }
  
  // console.log(`[ItemDetailPageWrapper] Rendering Suspense for ItemDetailsDisplay with itemId: ${params.id}`);
  return (
    <Suspense fallback={<ItemPageLoadingState />}>
      <ItemDetailsDisplay itemId={params.id} />
    </Suspense>
  );
}
