
'use client'; // Add 'use client' for the main data fetching and display logic

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Import useRouter
import type { Item as ItemType, UserProfileDocument, TradeChat, TradeChatParticipantInfo } from '@/types'; // Adjusted imports
import { Button } from '@/components/ui/button';
// Firebase imports
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'; // Added setDoc, serverTimestamp
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Star, UserCircle, Tag, Info, Repeat, Gift, Search, Link2 as LinkIcon, Loader2, HeartHandshake, MapPin, Truck, Edit2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ItemTradeInitiationContent from '@/components/items/ItemTradeInitiationContent';
import SuggestedMatches from '@/components/items/SuggestedMatches';
import TemporaryAdminMatchTestPanelClient from '@/components/items/TemporaryAdminMatchTestPanelClient';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast'; // For notifications

// Removed DUMMY_CURRENT_USER_ID

// getItemDetails will be part of the client component's useEffect
// async function getItemDetails(itemId: string): Promise<{ item: ItemType; ownerName: string; ownerAvatar?: string } | null> {
//   // Firestore fetching logic will be here
// }

const deliveryMethodDisplayMap: Record<ItemDeliveryMethod, string> = {
  pickup_only: "Pickup",
  willing_to_ship: "Willing to Ship",
  delivery_area: "Delivery Area (Details in Notes/Chat)",
  possible_delivery: "Possible Delivery (Discuss)",
  public_meetup: "Public Meetup",
  flexible_meetup: "Flexible Meetup",
};

// Simplified LogisticsDisplay, assuming owner details might not be fully available without a separate fetch
// or are denormalized differently in the Item object from Firestore.
function LogisticsDisplay({ logistics, ownerNameForLogistics }: { logistics?: ItemLogistics, ownerNameForLogistics?: string }) {
  if (!logistics) {
    return <p className="text-sm text-muted-foreground font-body">Logistics details not specified for this item.</p>;
  }

  let locationDisplay = "Location not specified for this item.";
  if (logistics.locationType === 'item_specific_location' && logistics.itemSpecificAddress) {
    locationDisplay = logistics.itemSpecificAddress;
  } else if (logistics.locationType === 'profile_stored_location') {
    // If owner's locations are not part of the Item object, this part needs adjustment
    // For now, we'll assume it might be a placeholder or needs more data.
    locationDisplay = `Owner's stored location (details may require profile view)`;
    if (logistics.selectedUserStoredLocationId) {
        locationDisplay = `Owner's stored location: ${logistics.selectedUserStoredLocationId}`; // Display ID if name not available
    }
  }
  // The logic for owner's default location would require fetching User profile, which is out of scope for item fetch for now.

  let timingDisplay = "Timing not specified.";
  if (logistics.timing) {
    if (logistics.timing.type === 'flexible') {
      timingDisplay = "Flexible";
    } else if (logistics.timing.type === 'fixed_date' && logistics.timing.date) {
      try {
        timingDisplay = `Fixed: ${format(new Date(logistics.timing.date), "PPP")}`;
      } catch (e) {
        timingDisplay = `Fixed: Invalid Date (${logistics.timing.date})`;
      }
    }
  }


  return (
    <div className="space-y-3">
      {logistics.locationType !== 'not_specified' && (
        <div>
            <h4 className="font-headline text-md flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground" /> Location:</h4>
            <p className="text-sm text-foreground/90 font-body pl-5">{locationDisplay}</p>
        </div>
      )}
       {(logistics.locationType === 'not_specified') && (
        <div>
             <h4 className="font-headline text-md flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground" /> Location:</h4>
            <p className="text-sm text-foreground/90 font-body pl-5">{locationDisplay}</p>
        </div>
      )}
      <div>
        <h4 className="font-headline text-md flex items-center gap-1.5"><Truck className="h-4 w-4 text-muted-foreground" /> Delivery:</h4>
        {logistics.deliveryMethods && logistics.deliveryMethods.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pl-5 mt-1">
            {logistics.deliveryMethods.map(method => (
              <Badge key={method} variant="outline" className="text-xs">
                {deliveryMethodDisplayMap[method] || method}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/90 font-body pl-5">Not specified</p>
        )}
      </div>

      {logistics.timing && (
        <div>
            <h4 className="font-headline text-md flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground" /> Timing:</h4>
            <p className="text-sm text-foreground/90 font-body pl-5">{timingDisplay}</p>
        </div>
      )}

      {logistics.notes && (
        <div>
          <h4 className="font-headline text-md flex items-center gap-1.5"><Edit2 className="h-4 w-4 text-muted-foreground" /> Notes:</h4>
          <p className="text-sm text-foreground/90 font-body pl-5 whitespace-pre-wrap">{logistics.notes}</p>
        </div>
      )}
    </div>
  );
}

// Helper function to convert Firestore data to UserProfileDocument, handling Timestamps
// Ensure this is defined before its use or imported.
const processUserProfileData = (docSnap: any): UserProfileDocument => {
  const data = docSnap.data();
  return {
    ...data,
    uid: docSnap.id,
    email: data.email || '', // ensure all UserProfileDocument fields are present
    displayName: data.displayName || '',
    photoURL: data.photoURL || undefined,
    bio: data.bio || undefined,
    displayLocation: data.displayLocation || undefined,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  } as UserProfileDocument;
};

// ItemDetailsDisplay is now a client component
function ItemDetailsDisplay({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<ItemType | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<UserProfileDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user: authUser } = useAuth(); // Get current authenticated user
  const router = useRouter();
  const { toast } = useToast();
  const [chatButtonLoading, setChatButtonLoading] = useState(false);


  useEffect(() => {
    let isMounted = true;

    if (!itemId) {
      if (isMounted) setError("No item ID provided.");
      if (isMounted) setIsLoading(false);
      return;
    }

    const fetchItemDetails = async () => {
      if (isMounted) setIsLoading(true);
      if (isMounted) setError(null);
      try {
        const itemRef = doc(db, "items", itemId);
        const itemSnap = await getDoc(itemRef);

        if (itemSnap.exists()) {
          const itemData = itemSnap.data();
          const createdAt = itemData.createdAt instanceof Timestamp ? itemData.createdAt.toDate() : itemData.createdAt;
          const fetchedItem = { ...itemData, id: itemSnap.id, createdAt } as ItemType;
          if (isMounted) setItem(fetchedItem);

          // After fetching item, fetch owner's profile if ownerId exists
          if (fetchedItem.ownerId) {
            const ownerRef = doc(db, "users", fetchedItem.ownerId);
            const ownerSnap = await getDoc(ownerRef);
            if (ownerSnap.exists()) {
              if (isMounted) setOwnerProfile(processUserProfileData(ownerSnap));
            } else {
              console.warn(`Owner profile not found for ownerId: ${fetchedItem.ownerId}`);
              // Create a partial owner profile from item data if full profile not found
              if (isMounted) setOwnerProfile({
                uid: fetchedItem.ownerId,
                displayName: fetchedItem.ownerName,
                email: '', // Email not available from item
                createdAt: new Date() // Placeholder
              } as UserProfileDocument);
            }
          } else {
             if (isMounted) setOwnerProfile(null); // No ownerId on item
          }
        } else {
          if (isMounted) setError("Item not found.");
          if (isMounted) setItem(null);
        }
      } catch (e: any) {
        console.error("Error fetching item or owner details:", e);
        if (isMounted) setError(e.message || "Failed to fetch details.");
        if (isMounted) setItem(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchItemDetails();

    return () => { isMounted = false; }; // Cleanup function
  }, [itemId]);

  if (isLoading) {
    return <ItemPageLoadingState />; // Use existing loading skeleton
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive text-center font-headline">Error</CardTitle></CardHeader>
          <CardContent><p className="text-center font-body">{error}</p></CardContent>
        </Card>
      </div>
    );
  }

  if (!item) {
    // This case should be covered by error state if item not found, but as a fallback:
    return (
      <div className="space-y-8">
        <Card>
          <CardHeader><CardTitle className="text-center font-headline">Item Not Found</CardTitle></CardHeader>
          <CardContent><p className="text-center font-body">Could not find an item with ID: {itemId}</p></CardContent>
        </Card>
      </div>
    );
  }

  const isCurrentUserOwner = authUser && item && item.ownerId === authUser.uid;

  const handleInitiateChat = async () => {
    if (!authUser || !item || !ownerProfile) {
      toast({ title: "Error", description: "Cannot initiate chat. User or item data missing.", variant: "destructive"});
      return;
    }
    if (isCurrentUserOwner) {
      toast({ title: "Info", description: "This is your own listing.", variant: "default"});
      return;
    }

    setChatButtonLoading(true);
    const participantIds = [authUser.uid, item.ownerId].sort();
    const chatId = `${participantIds[0]}_${participantIds[1]}_${item.id}`; // Deterministic chat ID

    try {
      const chatDocRef = doc(db, "tradeChats", chatId);
      const chatDocSnap = await getDoc(chatDocRef);

      if (chatDocSnap.exists()) {
        // Chat already exists, navigate to it
        router.push(`/trades/${chatId}`);
      } else {
        // Create new chat
        const currentUserInfo: TradeChatParticipantInfo = {
          userId: authUser.uid,
          displayName: authUser.displayName || authUser.email || 'Current User',
          photoURL: authUser.photoURL || undefined,
        };
        const ownerInfo: TradeChatParticipantInfo = {
          userId: item.ownerId,
          displayName: ownerProfile.displayName || item.ownerName || 'Owner',
          photoURL: ownerProfile.photoURL || undefined,
        };

        const newChatData: Omit<TradeChat, 'id'> = { // Omit 'id' as it's the document key
          itemIds: [item.id],
          participantIds: participantIds,
          participantInfo: [currentUserInfo, ownerInfo].sort((a,b) => a.userId.localeCompare(b.userId)), // Keep consistent order
          createdAt: serverTimestamp() as Date,
          updatedAt: serverTimestamp() as Date,
          lastMessageText: '',
          lastMessageTimestamp: serverTimestamp() as Date,
        };
        await setDoc(chatDocRef, newChatData);
        router.push(`/trades/${chatId}`);
      }
    } catch (err: any) {
      console.error("Error initiating chat:", err);
      toast({ title: "Chat Error", description: `Could not start or find chat: ${err.message}`, variant: "destructive"});
    } finally {
      setChatButtonLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative aspect-square md:aspect-auto min-h-[300px] md:min-h-0 bg-muted">
            <Image
              src={item.imageUrl || 'https://placehold.co/600x400.png'}
              alt={item.title}
              fill
              className="object-cover"
              data-ai-hint={item.dataAiHint || "item image"}
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          <div className="p-6 flex flex-col">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-headline text-3xl mb-2">{item.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="flex items-center gap-2">
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
                {item.listingType === 'offer' && item.isGiftItForward && (
                  <Badge variant="default" className="text-xs bg-pink-500 hover:bg-pink-600 text-white">
                    <HeartHandshake className="mr-1 h-3 w-3" /> Gift It Forward
                  </Badge>
                )}
                {item.openToAnyOpportunity && (
                  <Badge variant="outline" className="text-xs border-accent/50 text-accent">
                    Open to Any Opportunity
                  </Badge>
                )}
              </div>
              {item.createdAt && (
                 <p className="text-xs text-muted-foreground font-body">
                    Listed on: {format(new Date(item.createdAt), "PPP p")}
                 </p>
              )}
            </CardHeader>

            <CardContent className="p-0 flex-grow">
              <p className="font-body text-foreground/80 leading-relaxed whitespace-pre-wrap break-words mb-4">{item.description}</p>
              <Separator className="my-4" />
              <div className="space-y-3 mb-4">
                <h3 className="font-headline text-xl flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary" />Owner Details</h3>
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={ownerProfile?.photoURL || undefined} alt={ownerProfile?.displayName || item.ownerName || 'Owner'} />
                    <AvatarFallback>{(ownerProfile?.displayName || item.ownerName || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <Link href={`/profile/${item.ownerId}`} className="font-semibold text-primary hover:underline">
                      {ownerProfile?.displayName || item.ownerName || 'Unknown Owner'}
                    </Link>
                  </div>
                </div>
              </div>
              <Separator className="my-4" />
               <div className="space-y-3">
                <h3 className="font-headline text-xl flex items-center gap-2"><Truck className="h-6 w-6 text-primary" />Logistics Information</h3>
                <LogisticsDisplay logistics={item.logistics} ownerNameForLogistics={ownerProfile?.displayName || item.ownerName} />
              </div>
            </CardContent>

            <CardFooter className="p-0 pt-6 flex flex-col gap-2"> {/* Added flex-col and gap */}
              {!isCurrentUserOwner && item.status === 'available' && authUser && (
                <>
                  {item.listingType === 'offer' && item.isGiftItForward ? (
                      <Button asChild className="w-full bg-pink-500 hover:bg-pink-600 text-white" size="lg">
                        <Link href={`/profile/${item.ownerId}`}> {/* Or contact owner directly */}
                          <HeartHandshake className="mr-2 h-5 w-5" /> Express Interest / Contact Gifter
                        </Link>
                      </Button>
                    ) : (
                      // Replace or integrate ItemTradeInitiationContent with chat button
                      // For now, adding a new button for chat:
                      <Button onClick={handleInitiateChat} className="w-full" size="lg" disabled={chatButtonLoading}>
                        {chatButtonLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                        Chat with Owner
                      </Button>
                      // Original ItemTradeInitiationContent can be kept if it serves a different purpose (e.g. formal offers)
                      // <ItemTradeInitiationContent item={item} ownerName={ownerProfile?.displayName || item.ownerName || 'Owner'} ownerId={item.ownerId} />
                    )}
                </>
              )}
              {isCurrentUserOwner && item.status === 'available' && (
                <Button variant="outline" className="w-full" asChild><Link href={`/items/edit/${item.id}`}>Manage Your Listing</Link></Button>
              )}
              {item.status === 'traded' && <Badge variant="destructive" className="w-full text-center py-2 text-sm">Item Traded</Badge>}
              {item.status === 'pending' && <Badge variant="secondary" className="w-full text-center py-2 text-sm">Trade Pending</Badge>}
            </CardFooter>
          </div>
        </div>
      </Card>

      {!isCurrentUserOwner && item.status === 'available' && !(item.listingType === 'offer' && item.isGiftItForward) && (
        <Suspense fallback={<SuggestedMatchesLoadingState />}>
          <SuggestedMatches currentItem={item} />
        </Suspense>
      )}
      {isCurrentUserOwner && item.status === 'available' && <TemporaryAdminMatchTestPanelClient itemToTest={item} /> }
    </div>
  );
}

// ... (ItemPageLoadingState and SuggestedMatchesLoadingState remain the same)
function ItemPageLoadingState() {
  return (
    <div className="space-y-8 animate-pulse">
      <Card className="overflow-hidden shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative aspect-square md:aspect-auto min-h-[300px] md:min-h-0 bg-muted rounded-l-lg md:rounded-l-lg md:rounded-r-none"></div>
          <div className="p-6 flex flex-col">
            <div className="p-0 pb-4">
              <div className="h-8 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-5 w-5 bg-muted-foreground/20 rounded-full"></div>
                <div className="h-6 bg-muted-foreground/20 rounded w-1/3"></div>
              </div>
              <div className="h-5 bg-muted-foreground/20 rounded w-1/4 mb-4"></div>
            </div>
            <div className="p-0 flex-grow">
              <div className="h-4 bg-muted-foreground/20 rounded w-full mb-2"></div>
              <div className="h-4 bg-muted-foreground/20 rounded w-full mb-2"></div>
              <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-4"></div>
              <div className="my-4 h-px bg-border"></div>
              <div className="h-6 bg-muted-foreground/20 rounded w-1/3 mb-3"></div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted-foreground/20"></div>
                <div>
                  <div className="h-5 bg-muted-foreground/20 rounded w-24 mb-1"></div>
                  <div className="h-4 bg-muted-foreground/20 rounded w-32"></div>
                </div>
              </div>
               <div className="my-4 h-px bg-border"></div>
              <div className="h-6 bg-muted-foreground/20 rounded w-1/3 mb-3"></div>
              <div className="h-4 bg-muted-foreground/20 rounded w-full mb-2"></div>
              <div className="h-4 bg-muted-foreground/20 rounded w-5/6 mb-2"></div>
            </div>
            <div className="p-0 pt-6">
              <div className="h-10 bg-muted-foreground/20 rounded w-full"></div>
            </div>
          </div>
        </div>
      </Card>
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


export default function ItemDetailPageWrapper({ params }: { params: { id: string } }) {
  // const params = use(paramsProp); // 'use' is for server components to read client context/params if needed, not used here.

  if (!params || !params.id) {
    return (
      <div className="space-y-8">
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-destructive font-headline">Error: Missing Item ID</CardTitle></CardHeader>
          <CardContent><p className="font-body">The item ID was not provided in the request.</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Suspense fallback={<ItemPageLoadingState />}>
      <ItemDetailsDisplay itemId={params.id} />
    </Suspense>
  );
}
