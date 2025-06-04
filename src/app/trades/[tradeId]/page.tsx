
// This is a placeholder page for a specific trade.
// In a real application, this page would show trade details, item comparison, and the chat window.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Repeat, Info, UserCircle, Gift, Search } from 'lucide-react';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import ChatWindow from '@/components/chat/ChatWindow';
import { Button } from '@/components/ui/button'; 

interface TradeContext {
  tradeId: string;
  currentUser: User;
  otherUser: User;
  itemOfferedByOther: Item; // The item the current user is interested in (owned by otherUser)
  itemCurrentUserMightOffer: Item | null; // An item current User might offer in exchange
}

async function getTradeContext(tradeId: string, currentUserId: string): Promise<TradeContext | null> {
  const parts = tradeId.split('-');
  if (parts.length < 6 || parts[0] !== 'trade' || parts[2] !== 'wants' || parts[4] !== 'from') {
    console.warn("Invalid tradeId format for context:", tradeId);
    return null;
  }

  const initiatorId = parts[1]; // User who wants the item
  const targetItemId = parts[3]; // The item being wanted
  const targetItemOwnerId = parts[5]; // Owner of the targetItem

  const currentUser = dummyUsers.find(u => u.id === currentUserId);
  if (!currentUser) return null;

  let otherUser: User | undefined;
  let itemOfferedByOther: Item | undefined; // This is targetItem, owned by targetItemOwner
  let itemCurrentUserMightOffer: Item | null = null; 

  if (currentUserId === initiatorId) {
    // Current user is initiating, wants targetItem from targetItemOwner
    otherUser = dummyUsers.find(u => u.id === targetItemOwnerId);
    itemOfferedByOther = dummyItems.find(i => i.id === targetItemId && i.ownerId === targetItemOwnerId);
    // Try to find an item current user owns to pre-fill as potential offer
    itemCurrentUserMightOffer = dummyItems.find(i => i.ownerId === currentUserId && i.listingType === 'offer' && i.status === 'available') || null;

  } else if (currentUserId === targetItemOwnerId) {
    // Current user owns the targetItem, initiatorId wants it
    otherUser = dummyUsers.find(u => u.id === initiatorId);
    itemOfferedByOther = dummyItems.find(i => i.id === targetItemId && i.ownerId === currentUserId); // This item is current user's
    // Try to find an item initiator owns to pre-fill as what they might offer
    itemCurrentUserMightOffer = dummyItems.find(i => i.ownerId === initiatorId && i.listingType === 'offer' && i.status === 'available') || null;
  } else {
    console.warn(`User ${currentUserId} not directly involved in tradeId ${tradeId} as initiator or target owner.`);
    return null; 
  }

  if (!otherUser || !itemOfferedByOther) {
    console.warn("Could not determine otherUser or itemOfferedByOther for tradeId:", tradeId);
    return null;
  }
  
  // Re-evaluate roles for ChatWindow props:
  // ChatWindow's 'currentItem' = The item the 'otherUser' is offering (that 'currentUser' is interested in).
  // ChatWindow's 'requestedItemInitial' = The item 'currentUser' might offer in return.

  let chatWindowCurrentItem: Item;
  let chatWindowRequestedItem: Item | null;

  if (currentUserId === initiatorId) { // Current user wants itemOfferedByOther
      chatWindowCurrentItem = itemOfferedByOther;
      chatWindowRequestedItem = itemCurrentUserMightOffer; // What current user might offer
  } else { // currentUserId === targetItemOwnerId. Other user (initiatorId) wants itemOfferedByOther (which is current user's item)
      chatWindowCurrentItem = itemCurrentUserMightOffer!; // This is what the other user (initiator) offers. Could be null.
                                                        // If null, it means the other user has no obvious item.
                                                        // ChatWindow needs a currentItem. If initiator has no obvious item to offer,
                                                        // the "currentItem" for chat is still targetItem (owned by current user).
                                                        // The negotiation is "about" the targetItem.
      if (itemCurrentUserMightOffer) { // If initiator has an item to offer
         chatWindowCurrentItem = itemCurrentUserMightOffer;
         chatWindowRequestedItem = itemOfferedByOther; // What current user (targetItemOwner) might give up
      } else { // Initiator has no obvious item to offer. Negotiation is about current user's item.
         chatWindowCurrentItem = itemOfferedByOther; // This is the item current user owns, that other user wants
         chatWindowRequestedItem = null; // Other user's offer is TBD
      }
  }


  return {
    tradeId,
    currentUser,
    otherUser,
    itemOfferedByOther: chatWindowCurrentItem, 
    itemCurrentUserMightOffer: chatWindowRequestedItem,
  };
}


export default async function TradeDetailPage({ params }: { params: { tradeId: string } }) {
  const currentUserId = dummyUsers[0].id; 
  const tradeContext = await getTradeContext(params.tradeId, currentUserId);

  if (!tradeContext) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl text-destructive">Trade Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body">The details for this trade could not be loaded. It might be an invalid link or the trade no longer exists.</p>
          <Button asChild variant="link" className="mt-4">
            <Link href="/chats">Back to Chats</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { tradeId, currentUser, otherUser, itemOfferedByOther, itemCurrentUserMightOffer } = tradeContext;
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-2">
            <Repeat className="h-8 w-8 text-primary" />
            Trade Negotiation
          </CardTitle>
          <CardDescription className="font-body">
            Discussing trade with <Link href={`/profile/${otherUser.id}`} className="text-primary hover:underline font-semibold">{otherUser.name}</Link> for <span className="font-semibold">&quot;{itemOfferedByOther.name}&quot;</span>.
            {itemCurrentUserMightOffer && ` You might offer your "${itemCurrentUserMightOffer.name}".`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                    {itemOfferedByOther.listingType === 'offer' ? <Gift className="text-green-600" /> : <Search className="text-blue-600" />}
                    {otherUser.name} Offers / Wants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video w-full mb-2 rounded-md overflow-hidden">
                    <Image src={itemOfferedByOther.imageUrl || 'https://placehold.co/600x400.png'} alt={itemOfferedByOther.name} fill className="object-cover" data-ai-hint={itemOfferedByOther.dataAiHint || "item offered by other"} sizes="(max-width: 768px) 100vw, 50vw"/>
                </div>
                <h4 className="font-semibold text-lg">{itemOfferedByOther.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">{itemOfferedByOther.description}</p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                    <Link href={`/items/${itemOfferedByOther.id}`}>View Item</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                    <UserCircle className="text-primary" />
                     Your Potential Offer / Fulfillment
                </CardTitle>
                </CardHeader>
              <CardContent>
                {itemCurrentUserMightOffer ? (
                  <>
                    <div className="relative aspect-video w-full mb-2 rounded-md overflow-hidden">
                        <Image src={itemCurrentUserMightOffer.imageUrl || 'https://placehold.co/600x400.png'} alt={itemCurrentUserMightOffer.name} fill className="object-cover" data-ai-hint={itemCurrentUserMightOffer.dataAiHint || "item you might offer"} sizes="(max-width: 768px) 100vw, 50vw"/>
                    </div>
                    <h4 className="font-semibold text-lg">{itemCurrentUserMightOffer.name}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{itemCurrentUserMightOffer.description}</p>
                     <Button variant="outline" size="sm" asChild className="mt-2">
                        <Link href={`/items/${itemCurrentUserMightOffer.id}`}>View Your Item</Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground font-body">You can discuss what you'd like to offer from your items, or how you can fulfill their want, in the chat below.
                  Browse <Link href={`/profile/${currentUser.id}`} className="text-primary hover:underline">your inventory</Link>.
                  </p>
                )}
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
          <ChatWindow 
            currentItem={itemOfferedByOther} 
            requestedItemInitial={itemCurrentUserMightOffer} 
            otherUserId={otherUser.id}
            otherUserName={otherUser.name}
            tradeId={tradeId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
