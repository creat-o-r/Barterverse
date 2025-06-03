
import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Star, UserCircle, Tag, Info, Repeat, Gift, Search, HelpingHand, Link2 as LinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ItemTradeInitiationContent from '@/components/items/ItemTradeInitiationContent';
// import SuggestedMatches from '@/components/items/SuggestedMatches'; // Temporarily commented out
// import TemporaryAdminMatchTestPanelClient from '@/components/items/TemporaryAdminMatchTestPanelClient'; // Temporarily commented out
import { Separator } from '@/components/ui/separator';

async function getItemDetails(itemId: string): Promise<{ item: Item; owner: User } | null> {
  console.log(`[ItemDetailPage] getItemDetails called for ID: ${itemId}`);
  const item = dummyItems.find((i) => i.id === itemId);
  if (!item) {
    console.error(`[ItemDetailPage] getItemDetails: Item not found for ID: ${itemId}`);
    return null;
  }
  const owner = dummyUsers.find((u) => u.id === item.ownerId);
  if (!owner) {
    console.error(`[ItemDetailPage] getItemDetails: Owner not found for item ID: ${itemId}, owner ID: ${item.ownerId}`);
    return null;
  }
  console.log(`[ItemDetailPage] getItemDetails: Found item "${item.name}" and owner "${owner.name}"`);
  return { item, owner };
}

export default async function ItemDetailPage({ params: paramsProp }: { params: { id: string } }) {
  console.log('[ItemDetailPage] Rendering start...');
  try {
    const params = use(paramsProp);
    console.log(`[ItemDetailPage] Params received: ${JSON.stringify(params)}`);

    if (!params || !params.id) {
      console.error('[ItemDetailPage] Params or params.id is missing.');
      return (
        <div className="container mx-auto px-4 py-8">
          <Card className="border-destructive">
            <CardHeader><CardTitle className="text-destructive font-headline">Error: Missing Item ID</CardTitle></CardHeader>
            <CardContent><p className="font-body">The item ID was not provided in the request.</p></CardContent>
          </Card>
        </div>
      );
    }
    
    console.log(`[ItemDetailPage] Attempting to fetch details for item ID: ${params.id}`);
    const itemDetails = await getItemDetails(params.id);
    console.log(`[ItemDetailPage] Fetched itemDetails: ${itemDetails ? `Item: ${itemDetails.item.name}` : 'null'}`);

    if (!itemDetails) {
      return (
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader><CardTitle className="text-center">Item Not Found</CardTitle></CardHeader>
            <CardContent><p className="text-center font-body">Could not find an item with ID: {params.id}</p></CardContent>
          </Card>
        </div>
      );
    }

    const { item, owner } = itemDetails;
    // This check needs to be robust, ensure dummyUsers[0] exists if you rely on it.
    // For safety, let's assume current user is 'user1' if dummyUsers[0] is not defined, or handle appropriately.
    const currentUserId = dummyUsers[0]?.id || 'user1_fallback'; 
    const isCurrentUserOwner = item.ownerId === currentUserId;
    console.log(`[ItemDetailPage] Rendering item: ${item.name}, Owner: ${owner.name}, isCurrentUserOwner: ${isCurrentUserOwner}`);

    // Simplified JSX for debugging
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-3xl mb-2">{item.name} (DEBUG MODE)</CardTitle>
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-primary" />
              <Badge variant="secondary" className="text-sm">{item.category}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-body text-foreground/80 leading-relaxed whitespace-pre-wrap">{item.description}</p>
            <Separator className="my-4" />
            <h3 className="font-headline text-xl">Owner: {owner.name}</h3>
            <p>Status: {item.status}</p>
            <p>Listing Type: {item.listingType}</p>
            
            {/* Placeholder for where ItemTradeInitiationContent would go */}
            {!isCurrentUserOwner && item.status === 'available' && (
                <div className="mt-4 p-4 border rounded-md bg-muted/30">
                    <p className="font-semibold">Trade Initiation Area (Simplified)</p>
                    <p className="text-sm">Chat with {owner.name} for "{item.name}"</p>
                </div>
            )}
          </CardContent>
        </Card>
        
        {/*
        Temporarily commented out complex components:
        {!isCurrentUserOwner && item.status === 'available' && (
          <div className="mt-12">
            <Separator className="my-8" />
            <SuggestedMatches currentItem={item} />
          </div>
        )}
        <TemporaryAdminMatchTestPanelClient itemToTest={item} />
        */}
         <div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded-md">
            <h3 className="font-bold text-yellow-700">Debug Information:</h3>
            <p className="text-sm text-yellow-600">Page rendered with simplified content for debugging.</p>
            <p className="text-sm text-yellow-600">Item ID: {item.id}</p>
            <p className="text-sm text-yellow-600">Owner ID: {owner.id}</p>
            <p className="text-sm text-yellow-600">Is Current User Owner: {isCurrentUserOwner.toString()}</p>
            <p className="text-sm text-yellow-600">Current User ID (simulated): {currentUserId}</p>
        </div>
      </div>
    );

  } catch (e: any) {
    console.error("[ItemDetailPage] Catastrophic error during page rendering:", e);
    // This will be rendered by Next.js on the server if an error occurs in the try block
    return (
        <div className="container mx-auto px-4 py-8">
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive font-headline">Critical Page Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="font-body">A critical error occurred while trying to render this page.</p>
                    <p className="font-body mt-2 text-sm">Error Name: {e.name}</p>
                    <p className="font-body mt-2 text-sm">Error Message: {e.message}</p>
                    <h4 className="font-semibold mt-3">Stack Trace:</h4>
                    <pre className="mt-1 p-2 bg-muted rounded text-xs whitespace-pre-wrap max-h-60 overflow-auto">{e.stack}</pre>
                </CardContent>
            </Card>
        </div>
    );
  }
}
