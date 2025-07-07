"use client"; // Make the wrapper a client component to handle `use(paramsProp)` and then pass to server-fetched part

import { use, Suspense, useEffect, useState } from 'react'; // Added useEffect, useState
import Image from 'next/image';
import Link from 'next/link';
import { getItem, getUser } from '@/lib/firebase/firestoreUtils';
import type { Item, User, ItemLogistics, UserStoredLocation, ItemDeliveryMethod, ItemTiming } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Star, UserCircle, Tag, Info, Repeat, Gift, Search, Loader2, HeartHandshake, MapPin, Truck, Edit2, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ItemTradeInitiationContent from '@/components/items/ItemTradeInitiationContent';
import SuggestedMatches from '@/components/items/SuggestedMatches';
import TemporaryAdminMatchTestPanelClient from '@/components/items/TemporaryAdminMatchTestPanelClient';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import SpecificationsDisplay from '@/components/items/SpecificationsDisplay';
import { useAuth } from '@/contexts/AuthContext';

// Data fetching function remains async, can be called by server or client components
async function getItemDetails(itemId: string): Promise<{ item: Item; owner: User } | null> {
  const item = await getItem(itemId);
  if (!item) {
    console.warn(`[ItemDetailPage] Item with ID ${itemId} not found in Firestore.`);
    return null;
  }
  const owner = await getUser(item.ownerId);
  if (!owner) {
    console.warn(`[ItemDetailPage] Owner with ID ${item.ownerId} for item ${itemId} not found in Firestore.`);
    return null;
  }
  return { item, owner };
}

const deliveryMethodDisplayMap: Record<ItemDeliveryMethod, string> = {
  pickup_only: "Pickup",
  willing_to_ship: "Willing to Ship",
  delivery_area: "Delivery Area (Details in Notes/Chat)",
  possible_delivery: "Possible Delivery (Discuss)",
  public_meetup: "Public Meetup",
  flexible_meetup: "Flexible Meetup",
};

function LogisticsDisplay({ logistics, owner }: { logistics?: ItemLogistics, owner: User }) {
  if (!logistics) {
    return <p className="text-sm text-muted-foreground font-body">Logistics details not specified for this item.</p>;
  }
  // ... (rest of LogisticsDisplay remains the same)
  let locationDisplay = "Location not specified for this item.";
  if (logistics.locationType === 'profile_stored_location' && logistics.selectedUserStoredLocationId) {
    const storedLoc = owner.locations?.find(l => l.id === logistics.selectedUserStoredLocationId);
    locationDisplay = storedLoc ? `${storedLoc.name} (${storedLoc.address || 'Address not set'})` : "Stored address (details unavailable)";
  } else if (logistics.locationType === 'item_specific_location' && logistics.itemSpecificAddress) {
    locationDisplay = logistics.itemSpecificAddress;
  } else if (logistics.locationType !== 'not_specified') {
    const defaultStoredLocId = owner.logisticsPreferences?.preferredStoredLocationId;
    const defaultLoc = owner.locations?.find(l => l.id === defaultStoredLocId) || owner.locations?.find(l => l.isDefault);
    if (defaultLoc) {
      locationDisplay = `Owner's default: ${defaultLoc.name} (${defaultLoc.address || 'Address not specified'})`;
    }
  }

  let timingDisplay = "Timing not specified.";
  if (logistics.timing) {
    if (logistics.timing.type === 'flexible') {
      timingDisplay = "Flexible";
    } else if (logistics.timing.type === 'fixed_date' && logistics.timing.date) {
      try {
        const dateInput = (typeof logistics.timing.date === 'string' || typeof logistics.timing.date === 'number')
                            ? logistics.timing.date
                            : (logistics.timing.date as any)?.seconds ? (logistics.timing.date as any).toDate() : undefined;
        if (dateInput) {
            timingDisplay = `Fixed: ${format(new Date(dateInput), "PPP")}`;
        } else {
            timingDisplay = `Fixed: Invalid Date (received: ${JSON.stringify(logistics.timing.date)})`;
        }
      } catch (e) {
        timingDisplay = `Fixed: Error formatting date (${logistics.timing.date})`;
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

// This is now the main client component that handles displaying the fetched item.
function ItemDetailsDisplay({ itemDetails, itemId }: { itemDetails: { item: Item; owner: User } | null, itemId: string }) {
  const { currentUser: firebaseUser, isLoading: authIsLoading } = useAuth();

  if (!itemDetails) {
    return (
      <div className="space-y-8">
        <Card className="border-destructive">
          <CardHeader><CardTitle className="text-center font-headline text-destructive flex items-center justify-center gap-2">
            <AlertTriangle className="h-6 w-6" /> Item Not Found
            </CardTitle></CardHeader>
          <CardContent><p className="text-center font-body">Could not find an item with ID: {itemId}. It may have been removed or the ID is incorrect.</p></CardContent>
        </Card>
      </div>
    );
  }

  const { item, owner } = itemDetails;
  const isCurrentUserOwner = !authIsLoading && firebaseUser ? item.ownerId === firebaseUser.uid : false;

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden shadow-lg">
        <div className="relative aspect-video w-full bg-muted">
          <Image
            src={item.imageUrl || 'https://placehold.co/600x400.png'}
            alt={item.name}
            fill
            className="object-cover"
            data-ai-hint={item.dataAiHint || "item image"}
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
        <div className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="font-headline text-3xl mb-2">{item.name}</CardTitle>
              {/* ... (rest of CardHeader content remains the same) ... */}
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
            </CardHeader>
            <CardContent className="p-0 flex-grow">
              <p className="font-body text-foreground/80 leading-relaxed whitespace-pre-wrap break-words mb-4">{item.description}</p>
              <SpecificationsDisplay specifications={item.specifications} />
              <Separator className="my-4" />
              <div className="space-y-3 mb-4">
                <h3 className="font-headline text-xl flex items-center gap-2"><UserCircle className="h-6 w-6 text-primary" />Owner Details</h3>
                {/* ... (rest of Owner Details remains the same) ... */}
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
              <Separator className="my-4" />
               <div className="space-y-3">
                <h3 className="font-headline text-xl flex items-center gap-2"><Truck className="h-6 w-6 text-primary" />Logistics Information</h3>
                <LogisticsDisplay logistics={item.logistics} owner={owner} />
              </div>
            </CardContent>
            <CardFooter className="p-0 pt-6">
              {/* Conditional rendering based on isCurrentUserOwner and item status */}
              {!isCurrentUserOwner && item.status === 'available' && (
                 item.listingType === 'offer' && item.isGiftItForward ? (
                    <Button asChild className="w-full bg-pink-500 hover:bg-pink-600 text-white" size="lg">
                      <Link href={`/profile/${owner.id}`}>
                        <HeartHandshake className="mr-2 h-5 w-5" /> Express Interest / Contact Gifter
                      </Link>
                    </Button>
                  ) : (
                    <ItemTradeInitiationContent item={item} ownerName={owner.name} ownerId={owner.id} />
                  )
              )}
              {isCurrentUserOwner && item.status === 'available' && (
                <Button variant="outline" className="w-full">Manage Your Listing</Button>
              )}
              {item.status === 'traded' && <Badge variant="destructive" className="w-full text-center py-2 text-sm">Item Traded</Badge>}
              {item.status === 'pending' && <Badge variant="secondary" className="w-full text-center py-2 text-sm">Trade Pending</Badge>}
            </CardFooter>
        </div>
      </Card>

      {/* SuggestedMatches and TemporaryAdminMatchTestPanelClient are client components and will use their own auth context */}
      {!isCurrentUserOwner && item.status === 'available' && !(item.listingType === 'offer' && item.isGiftItForward) && (
        <Suspense fallback={<SuggestedMatchesLoadingState />}>
          <SuggestedMatches currentItem={item} />
        </Suspense>
      )}
      {isCurrentUserOwner && item.status === 'available' && <TemporaryAdminMatchTestPanelClient itemToTest={item} /> }
    </div>
  );
}

// Server Component to fetch data and pass to Client Component
async function ItemDetailPageDataFetcher({ itemId }: { itemId: string }) {
  const itemDetails = await getItemDetails(itemId);
  return <ItemDetailsDisplay itemDetails={itemDetails} itemId={itemId} />;
}

// Loading state component remains the same
function ItemPageLoadingState() {
  // ... (content of ItemPageLoadingState)
  return (
    <div className="space-y-8 animate-pulse">
      <Card className="overflow-hidden shadow-lg">
        <div className="relative aspect-video w-full bg-muted rounded-t-lg"></div>
        <div className="p-6">
            <div className="h-8 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-5 w-5 bg-muted-foreground/20 rounded-full"></div>
              <div className="h-6 bg-muted-foreground/20 rounded w-1/3"></div>
            </div>
            <div className="h-5 bg-muted-foreground/20 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-muted-foreground/20 rounded w-full mb-2"></div>
            <div className="h-4 bg-muted-foreground/20 rounded w-full mb-2"></div>
            <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-4"></div>
            <div className="my-4 h-px bg-border"></div>
            <div className="h-10 bg-muted-foreground/20 rounded w-full mb-4"></div>
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
            <div className="pt-6">
              <div className="h-10 bg-muted-foreground/20 rounded w-full"></div>
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
// SuggestedMatchesLoadingState remains the same
function SuggestedMatchesLoadingState() {
  // ... (content of SuggestedMatchesLoadingState)
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

// The main page component wrapper
export default function ItemDetailPageWrapper({ params }: { params: { id: string }}) {
  // No longer using `use(paramsProp)` if params is directly passed for app router pages
  if (!params?.id) {
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
      <ItemDetailPageDataFetcher itemId={params.id} />
    </Suspense>
  );
}
