
// src/app/opportunities/page.tsx
'use client';

import { useState, useEffect } from 'react'; // Added this line
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, UserCircle, Repeat, Link2, ArrowRightLeft, Info, Eye, Gift, Search, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Helper to get item and owner details
async function getItemAndOwner(itemId: string | null): Promise<{ item: Item; owner: User } | null> {
  if (!itemId) return null;
  const item = dummyItems.find((i) => i.id === itemId);
  if (!item) return null;
  const owner = dummyUsers.find((u) => u.id === item.ownerId);
  if (!owner) return null; // Should have consistent data
  return { item, owner };
}

// Item display component for this page
function OpportunityItemDisplay({ item, owner, isMainItem }: { item: Item; owner: User; isMainItem?: boolean }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            {isMainItem ? <Package className="h-6 w-6 text-primary" /> : (item.listingType === 'offer' ? <Gift className="h-6 w-6 text-green-600" /> : <Search className="h-6 w-6 text-blue-600" />)}
            {isMainItem ? "Main Item" : (item.listingType === 'offer' ? "Suggested Offer" : "Suggested Want")}
          </CardTitle>
           <Badge variant="outline" className="capitalize">{item.listingType}</Badge>
        </div>
        <CardDescription className="font-body">{item.name}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="aspect-video relative w-full rounded-md overflow-hidden">
          <Image
            src={item.imageUrl || 'https://placehold.co/600x400.png'}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            data-ai-hint={item.dataAiHint || "opportunity item"}
          />
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3 font-body">{item.description}</p>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={owner.avatarUrl} alt={owner.name} data-ai-hint={owner.dataAiHint || "owner avatar"}/>
            <AvatarFallback>{owner.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <Link href={`/profile/${owner.id}`} className="text-sm font-semibold hover:text-primary">{owner.name}</Link>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/items/${item.id}`}><Eye className="mr-2 h-4 w-4" /> View Full Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function OpportunityMatchPage() {
  const searchParams = useSearchParams();
  const mainItemId = searchParams.get('mainItemId');
  const suggestedItemId = searchParams.get('suggestedItemId');

  const [mainItemDetails, setMainItemDetails] = useState<{ item: Item; owner: User } | null>(null);
  const [suggestedItemDetails, setSuggestedItemDetails] = useState<{ item: Item; owner: User } | null>(null);
  const [loading, setLoading] = useState(true);

  const currentUserId = dummyUsers[0].id; // Simulated current user

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const mainDetails = await getItemAndOwner(mainItemId);
      const suggestedDetails = await getItemAndOwner(suggestedItemId);
      setMainItemDetails(mainDetails);
      setSuggestedItemDetails(suggestedDetails);
      setLoading(false);
    }
    fetchData();
  }, [mainItemId, suggestedItemId]);

  if (loading) {
    return <div className="text-center py-10 font-body">Loading opportunity details...</div>;
  }

  if (!mainItemDetails || !suggestedItemDetails) {
    return <div className="text-center py-10 font-body text-destructive">Could not load opportunity. Items may be invalid or no longer available.</div>;
  }

  // Determine tradeId for negotiation
  // Assumption: Current user wants to acquire the 'suggestedItem' from its owner.
  // The 'mainItem' is the context (e.g., what current user might offer if they own it).
  let tradeId = '';
  let chatButtonText = 'Start Negotiation';
  let negotiationContextValid = true;

  const mainItem = mainItemDetails.item;
  const mainItemOwner = mainItemDetails.owner;
  const suggestedItem = suggestedItemDetails.item;
  const suggestedItemOwner = suggestedItemDetails.owner;
  
  // Scenario: Current user owns mainItem, and wants suggestedItem (which is an offer from another user)
  if (mainItem.ownerId === currentUserId && suggestedItem.listingType === 'offer' && suggestedItem.ownerId !== currentUserId) {
    tradeId = `trade-${currentUserId}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`;
    chatButtonText = `Negotiate for ${suggestedItemOwner.name}'s "${suggestedItem.name}"`;
  } 
  // Scenario: Current user owns suggestedItem (which is an offer), and mainItem is a want from another user they might fulfill
  else if (suggestedItem.ownerId === currentUserId && mainItem.listingType === 'want' && mainItem.ownerId !== currentUserId) {
     tradeId = `trade-${mainItem.ownerId}-wants-${suggestedItem.id}-from-${currentUserId}`; // Other user wants current user's item
     chatButtonText = `Discuss fulfilling ${mainItemOwner.name}'s want for "${mainItem.name}"`;
  }
  // Scenario: mainItem is an offer from someone else, suggestedItem is a want from someone else (3-way potential, current user is viewer)
  // OR mainItem is a want, suggestedItem is an offer, and current user owns neither
  else if (mainItem.ownerId !== currentUserId && suggestedItem.ownerId !== currentUserId) {
    // This is a more complex scenario. For now, disable direct negotiation from opportunity page.
    // User should go to individual item pages to contact owners.
    negotiationContextValid = false;
    chatButtonText = "View Items to Negotiate"; // Or hide button
  }
  // Other scenarios might exist, e.g., both items are 'wants'.
  else {
      // Default or less clear scenarios, user might need to go to item pages
      negotiationContextValid = false;
      chatButtonText = "View Items to Explore";
  }


  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card>
        <CardHeader className="text-center">
          <Link2 className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle className="font-headline text-3xl">Trade Opportunity</CardTitle>
          <CardDescription className="font-body">
            An AI-suggested potential match between these two items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <OpportunityItemDisplay item={mainItemDetails.item} owner={mainItemDetails.owner} isMainItem={true} />
            <div className="hidden md:flex flex-col items-center justify-center h-full pt-16">
                <ArrowRightLeft className="h-12 w-12 text-muted-foreground my-4" />
                <Badge variant="secondary">Potential Match</Badge>
            </div>
            <div className="md:hidden my-4"> <Separator /> </div>
            <OpportunityItemDisplay item={suggestedItemDetails.item} owner={suggestedItemDetails.owner} />
          </div>
          <Separator />
          <div className="text-center">
            <h3 className="font-headline text-xl mb-2">Next Steps</h3>
            {negotiationContextValid ? (
                 <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href={`/trades/${tradeId}`}>
                        <MessageSquare className="mr-2 h-5 w-5" /> {chatButtonText}
                    </Link>
                </Button>
            ) : (
                <p className="text-muted-foreground font-body">
                    This opportunity involves items from multiple other users or a different trade dynamic.
                    Please visit the individual item pages to initiate contact or negotiation.
                </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
