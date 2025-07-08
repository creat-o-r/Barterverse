// src/app/trades/[tradeId]/page.tsx

import { Suspense } from 'react';
import { use } from 'react'; // Required for resolving promise params in Server Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Repeat, Gift, Search, AlertTriangle, UserCircle } from 'lucide-react';
import { getItem, getUser } from '@/lib/firebase/firestoreUtils';
import type { Item, User } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import ChatWindow from '@/components/chat/ChatWindow'; // This will be a Client Component
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface TradePageContext {
  tradeId: string;
  initiator: User;          // User who wants the targetItem (User A)
  targetItemOwner: User;    // User who owns targetItem (User B)
  targetItem: Item;         // The item User A wants from User B
  // We remove initiatorItemOffer from server-side context; ChatWindow can handle this selection.
}

async function getTradePageContext(tradeId: string): Promise<TradePageContext | null> {
  const parts = tradeId.split('-');
  // Expected format: trade-${initiatorId}-wants-${targetItemId}-from-${targetItemOwnerId}
  if (parts.length < 6 || parts[0] !== 'trade' || parts[2] !== 'wants' || parts[4] !== 'from') {
    console.warn("Invalid tradeId format for TradeDetailPage context:", tradeId);
    return null;
  }

  const initiatorId = parts[1];
  const targetItemId = parts[3];
  const targetItemOwnerId = parts[5];

  const [initiator, targetItemOwner, targetItem] = await Promise.all([
    getUser(initiatorId),
    getUser(targetItemOwnerId),
    getItem(targetItemId)
  ]);

  if (!initiator || !targetItemOwner || !targetItem) {
    console.warn(`Could not fetch all necessary data for tradeId ${tradeId}: initiator: ${!!initiator}, targetItemOwner: ${!!targetItemOwner}, targetItem: ${!!targetItem}`);
    return null;
  }

  // Validate ownership: targetItem must be owned by targetItemOwner
  if (targetItem.ownerId !== targetItemOwner.id) {
    console.warn(`Item ownership mismatch for tradeId ${tradeId}: item ${targetItemId} owner is ${targetItem.ownerId}, expected ${targetItemOwner.id}`);
    return null;
  }
  // Validate initiator is not the same as target owner for this tradeId structure
  if (initiatorId === targetItemOwnerId) {
    console.warn(`Initiator and target owner are the same for tradeId ${tradeId}. This trade structure is for two distinct users.`);
    return null;
  }

  return {
    tradeId,
    initiator,
    targetItemOwner,
    targetItem,
  };
}

function TradeDetailPageLoading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 animate-pulse">
      <Card>
        <CardHeader>
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-md">
              <CardHeader><div className="h-6 bg-muted rounded w-1/2"></div></CardHeader>
              <CardContent><div className="aspect-video w-full bg-muted rounded-md mb-2"></div><div className="h-5 bg-muted rounded w-3/4"></div></CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader><div className="h-6 bg-muted rounded w-1/2"></div></CardHeader>
              <CardContent><div className="aspect-video w-full bg-muted rounded-md mb-2"></div><div className="h-5 bg-muted rounded w-3/4"></div></CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><div className="h-7 bg-muted rounded w-1/3"></div></CardHeader>
        <CardContent><div className="h-64 bg-muted rounded"></div></CardContent>
      </Card>
    </div>
  );
}

async function TradeDetailContent({ tradeId }: { tradeId: string }) {
  const context = await getTradePageContext(tradeId);

  if (!context) {
    return (
      <Card className="max-w-4xl mx-auto my-8">
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-destructive flex items-center gap-2">
            <AlertTriangle /> Trade Information Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body">The details for this trade (ID: {tradeId}) could not be loaded. The link might be invalid, or associated users/items may no longer exist.</p>
          <Button asChild variant="link" className="mt-4 px-0">
            <Link href="/chats">Back to Chats</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { initiator, targetItemOwner, targetItem } = context;
  
  // Props for ChatWindow:
  // - currentItem: The item the other party has that the current user is interested in.
  // - requestedItemInitial: An item the current user might initially offer (can be null).
  // - otherUserId: The ID of the other user in the chat.
  // - otherUserName: The name of the other user.
  // ChatWindow will use useAuth() to determine its own identity and perspective.

  // From the perspective of the trade defined by tradeId (initiator wants targetItem from targetItemOwner):
  // The primary item of interest is targetItem.
  // The other party involved with targetItem is targetItemOwner.
  // The initiator (initiator) might offer something (or nothing initially).

  // The ChatWindow needs to be flexible. We pass it the core item of negotiation (targetItem)
  // and the details of the *other* user involved *relative to the perspective of the trade link*.
  // If the logged-in user is `initiator`, then `otherUser` is `targetItemOwner`.
  // If the logged-in user is `targetItemOwner`, then `otherUser` is `initiator`.
  // The `ChatWindow` component handles this internal perspective via `useAuth`.

  // So, for the props of ChatWindow:
  // - `currentItem` = `targetItem` (the item being negotiated over)
  // - `otherUserId` = (this will be dynamically determined by ChatWindow based on who is logged in between initiator and targetItemOwner)
  // - `otherUserName` = (similarly dynamic)
  // - `tradeId` = `tradeId`
  // - `requestedItemInitial` = null (let user select in chat)

  // We need to pass enough info for ChatWindow to figure out the participants.
  // Let's pass the item being negotiated (targetItem) and the two participants.
  // ChatWindow will use useAuth() to determine which participant is "self" and which is "other".

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0"> {/* Added padding for mobile */}
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-2">
            <Repeat className="h-8 w-8 text-primary" />
            Trade Negotiation
          </CardTitle>
          <CardDescription className="font-body">
            Negotiation between <Link href={`/profile/${initiator.id}`} className="text-primary hover:underline font-semibold">{initiator.name}</Link> (wants item)
            and <Link href={`/profile/${targetItemOwner.id}`} className="text-primary hover:underline font-semibold">{targetItemOwner.name}</Link> (owns item)
            regarding &quot;{targetItem.name}&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item targetItemOwner has (that initiator wants) */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                  {targetItem.listingType === 'offer' ? <Gift className="text-green-600" /> : <Search className="text-blue-600" />}
                  {targetItemOwner.name} Has: &quot;{targetItem.name}&quot;
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video w-full mb-2 rounded-md overflow-hidden">
                    <Image src={targetItem.imageUrl || 'https://placehold.co/600x400.png'} alt={targetItem.name} fill className="object-cover" data-ai-hint={targetItem.dataAiHint || "target item"} sizes="(max-width: 768px) 100vw, 50vw"/>
                </div>
                <h4 className="font-semibold text-lg">{targetItem.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">{targetItem.description}</p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                    <Link href={`/items/${targetItem.id}`}>View Item</Link>
                </Button>
              </CardContent>
            </Card>
            
            {/* Placeholder for what initiator might offer */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                    <UserCircle className="text-primary" />
                     {initiator.name}'s Potential Offer
                </CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-muted-foreground font-body">
                    {initiator.name} can propose an item or discuss terms in the chat below.
                    They can browse <Link href={`/profile/${initiator.id}`} className="text-primary hover:underline">their inventory</Link>.
                  </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" />
            Negotiation Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Pass all necessary context for ChatWindow to determine roles based on its own auth state */}
          <ChatWindow 
            tradeId={tradeId}
            currentItem={targetItem} // The item the trade is fundamentally about
            otherUserId={targetItemOwner.id}
            otherUserName={targetItemOwner.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Wrapper component to handle the promise from params
export default function TradeDetailPageWrapper({ params: paramsProp }: { params: Promise<{ tradeId: string }> }) {
  const params = use(paramsProp);
  return (
    <Suspense fallback={<TradeDetailPageLoading/>}>
      <TradeDetailContent tradeId={params.tradeId} />
    </Suspense>
  );
}
