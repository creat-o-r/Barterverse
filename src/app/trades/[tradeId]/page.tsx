
// This is a placeholder page for a specific trade.
// In a real application, this page would show trade details, item comparison, and the chat window.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Repeat, Info, UserCircle, Gift, Search } from 'lucide-react';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import ChatWindow from '@/components/chat/ChatWindow';

interface TradeContext {
  tradeId: string;
  currentUser: User;
  otherUser: User;
  itemOfferedByOther: Item; // The item the current user is interested in (owned by otherUser)
  itemRequestedFromCurrent: Item | null; // An item the otherUser might want from currentUser (can be TBD)
}

// Simulate fetching trade context based on tradeId and currentUser
// This is highly simplified for the demo.
async function getTradeContext(tradeId: string, currentUserId: string): Promise<TradeContext | null> {
  // Example tradeId format: trade-${currentUserId}-wants-${itemId}-from-${otherUserId}
  const parts = tradeId.split('-');
  if (parts.length < 6 || parts[0] !== 'trade' || parts[2] !== 'wants' || parts[4] !== 'from') {
    console.warn("Invalid tradeId format:", tradeId);
    return null;
  }

  const initiatorId = parts[1];
  const targetItemId = parts[3];
  const targetItemOwnerId = parts[5];
  
  const currentUser = dummyUsers.find(u => u.id === currentUserId);
  if (!currentUser) return null;

  let otherUser: User | undefined;
  let itemOfferedByOther: Item | undefined;
  
  // Logic to determine roles based on who the current user is
  if (currentUserId === initiatorId) { // Current user initiated this trade request for other's item
    otherUser = dummyUsers.find(u => u.id === targetItemOwnerId);
    itemOfferedByOther = dummyItems.find(i => i.id === targetItemId && i.ownerId === targetItemOwnerId);
  } else if (currentUserId === targetItemOwnerId) { // Current user owns the target item, initiator wants it
    otherUser = dummyUsers.find(u => u.id === initiatorId);
    itemOfferedByOther = dummyItems.find(i => i.id === targetItemId && i.ownerId === currentUserId);
  } else {
    return null; // Current user is not part of this tradeId structure
  }

  if (!otherUser || !itemOfferedByOther) return null;

  // For requestedItemFromCurrent, this would typically be TBD or from a specific trade offer record.
  // For this demo, let's find a sample item from the current user if they are the one receiving the request.
  let itemRequestedFromCurrent: Item | null = null;
  if (currentUserId === targetItemOwnerId) { // If current user owns the item the other person wants
      // We could find a dummy item from initiatorId's items to simulate what they might offer.
      // This part is very speculative for a generic tradeId.
      // For now, let's keep it simple:
      const anItemOfInitiator = dummyItems.find(i => i.ownerId === initiatorId && i.listingType === 'offer');
      if(anItemOfInitiator) itemRequestedFromCurrent = anItemOfInitiator;

  }


  return {
    tradeId,
    currentUser,
    otherUser,
    itemOfferedByOther, // This is the item the negotiation is primarily about
    itemRequestedFromCurrent, // This is what the other party might want / what current user might offer
  };
}


export default async function TradeDetailPage({ params }: { params: { tradeId: string } }) {
  const currentUserId = dummyUsers[0].id; // Simulate current user
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

  const { tradeId, currentUser, otherUser, itemOfferedByOther, itemRequestedFromCurrent } = tradeContext;
  
  // Determine items for display from current user's perspective
  // `itemCurrentUserIsInterestedIn` is `itemOfferedByOther`
  // `itemCurrentUserMightOffer` is `itemRequestedFromCurrent` (if currentUser is initiator) or one of currentUser's items (if currentUser is targetItemOwner)

  const itemCurrentUserIsInterestedIn = itemOfferedByOther;
  // What the current user might offer in exchange. If current user initiated, they are looking to get itemOfferedByOther.
  // The negotiation will determine what they offer. For display, if itemRequestedFromCurrent is set (i.e. other user is offering it), show it.
  // Otherwise, it's TBD.
  const itemCurrentUserMightOffer = itemRequestedFromCurrent && itemRequestedFromCurrent.ownerId === currentUser.id ? itemRequestedFromCurrent : 
                                    (dummyItems.find(i => i.ownerId === currentUser.id && i.listingType === 'offer' && i.id !== itemCurrentUserIsInterestedIn.id) || null);


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-2">
            <Repeat className="h-8 w-8 text-primary" />
            Trade Negotiation
          </CardTitle>
          <CardDescription className="font-body">
            Discussing trade with <Link href={`/profile/${otherUser.id}`} className="text-primary hover:underline font-semibold">{otherUser.name}</Link> for their item: <span className="font-semibold">{itemCurrentUserIsInterestedIn.name}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                    {itemCurrentUserIsInterestedIn.listingType === 'offer' ? <Gift className="text-green-600" /> : <Search className="text-blue-600" />}
                    {otherUser.name} Offers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video w-full mb-2 rounded-md overflow-hidden">
                    <Image src={itemCurrentUserIsInterestedIn.imageUrl || 'https://placehold.co/600x400.png'} alt={itemCurrentUserIsInterestedIn.name} layout="fill" objectFit="cover" data-ai-hint={itemCurrentUserIsInterestedIn.dataAiHint || "item offered by other"}/>
                </div>
                <h4 className="font-semibold text-lg">{itemCurrentUserIsInterestedIn.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">{itemCurrentUserIsInterestedIn.description}</p>
                <Button variant="outline" size="sm" asChild className="mt-2">
                    <Link href={`/items/${itemCurrentUserIsInterestedIn.id}`}>View Item</Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center gap-2">
                    <UserCircle className="text-primary" />
                     Your Potential Offer
                </CardTitle>
                </CardHeader>
              <CardContent>
                {itemCurrentUserMightOffer ? (
                  <>
                    <div className="relative aspect-video w-full mb-2 rounded-md overflow-hidden">
                        <Image src={itemCurrentUserMightOffer.imageUrl || 'https://placehold.co/600x400.png'} alt={itemCurrentUserMightOffer.name} layout="fill" objectFit="cover" data-ai-hint={itemCurrentUserMightOffer.dataAiHint || "item you might offer"}/>
                    </div>
                    <h4 className="font-semibold text-lg">{itemCurrentUserMightOffer.name}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">{itemCurrentUserMightOffer.description}</p>
                     <Button variant="outline" size="sm" asChild className="mt-2">
                        <Link href={`/items/${itemCurrentUserMightOffer.id}`}>View Your Item</Link>
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground font-body">You can discuss what you'd like to offer from your items in the chat below.
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
            currentItem={itemCurrentUserIsInterestedIn} // This is the item the 'otherUser' is offering, and the context of negotiation.
            requestedItemInitial={itemCurrentUserMightOffer} // This is what current user might offer.
            otherUserId={otherUser.id}
            otherUserName={otherUser.name}
            tradeId={tradeId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
