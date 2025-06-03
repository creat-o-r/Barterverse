
// src/app/opportunities/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import type { Item, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, UserCircle, Repeat, Link2, ArrowRightLeft, Info, Eye, Gift, Search, Package, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// Helper to get item and owner details
async function getItemAndOwner(itemId: string | null): Promise<{ item: Item; owner: User } | null> {
  if (!itemId) return null;
  const item = dummyItems.find((i) => i.id === itemId);
  if (!item) return null;
  const owner = dummyUsers.find((u) => u.id === item.ownerId);
  if (!owner) return null;
  return { item, owner };
}

// Item display component for this page
function OpportunityItemDisplay({ item, owner, label, itemTypeLabel }: { item: Item; owner: User; label: string; itemTypeLabel: string }) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            {item.listingType === 'offer' ? <Gift className="h-6 w-6 text-green-600" /> : <Search className="h-6 w-6 text-blue-600" />}
            {label}
          </CardTitle>
           <Badge variant="outline" className="capitalize">{itemTypeLabel}</Badge>
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
           <div className="flex items-center text-xs text-muted-foreground ml-auto">
            <Star className="h-3 w-3 mr-0.5 text-yellow-400 fill-yellow-400" />
            {owner.rating.toFixed(1)}
          </div>
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

  const mainItem = mainItemDetails.item;
  const mainItemOwner = mainItemDetails.owner;
  const suggestedItem = suggestedItemDetails.item;
  const suggestedItemOwner = suggestedItemDetails.owner;
  
  let tradeId = '';
  let chatButtonText = 'Start Negotiation';
  let negotiationContextValid = true;

  // Determine labels for display
  let mainItemDisplayLabel = "Context Item";
  let mainItemTypeLabel = mainItem.listingType;
  if (mainItem.ownerId === currentUserId) {
    mainItemDisplayLabel = mainItem.listingType === 'offer' ? "Your Offer" : "Your Want";
  } else {
    mainItemDisplayLabel = mainItem.listingType === 'offer' ? "Their Offer" : "Their Want";
  }

  let suggestedItemDisplayLabel = suggestedItem.listingType === 'offer' ? "Matching Offer" : "Matching Want";
  let suggestedItemTypeLabel = suggestedItem.listingType;


  // --- Trade ID and Chat Button Text Logic ---
  // Scenario 1: Current user initiated interest in suggestedItem (which is an offer by someone else), using mainItem (their own offer) as context.
  if (mainItem.ownerId === currentUserId && mainItem.listingType === 'offer' && 
      suggestedItem.listingType === 'offer' && suggestedItem.ownerId !== currentUserId) {
    tradeId = `trade-${currentUserId}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`; // CurrentUser wants suggestedItem
    chatButtonText = `Offer Your "${mainItem.name}" for ${suggestedItemOwner.name}'s "${suggestedItem.name}"`;
  }
  // Scenario 2: Current user was viewing mainItem (an offer by someone else), and AI suggested one of current user's own items (suggestedItem, an offer) as a potential trade for mainItem.
  else if (suggestedItem.ownerId === currentUserId && suggestedItem.listingType === 'offer' &&
           mainItem.listingType === 'offer' && mainItem.ownerId !== currentUserId) {
    tradeId = `trade-${currentUserId}-wants-${mainItem.id}-from-${mainItem.ownerId}`; // CurrentUser wants mainItem
    chatButtonText = `Offer Your "${suggestedItem.name}" for ${mainItemOwner.name}'s "${mainItem.name}"`;
  }
  // Scenario 3: Current user was viewing mainItem (a want by someone else), and AI suggested one of current user's own items (suggestedItem, an offer) to fulfill that want.
  else if (suggestedItem.ownerId === currentUserId && suggestedItem.listingType === 'offer' &&
           mainItem.listingType === 'want' && mainItem.ownerId !== currentUserId) {
    tradeId = `trade-${mainItem.ownerId}-wants-${suggestedItem.id}-from-${currentUserId}`; // mainItemOwner wants suggestedItem (from current user)
    chatButtonText = `Offer Your "${suggestedItem.name}" to Fulfill ${mainItemOwner.name}'s Want`;
  }
  // Scenario 4: Current user listed mainItem (their want), and AI suggested suggestedItem (an offer from someone else) to fulfill it.
  else if (mainItem.ownerId === currentUserId && mainItem.listingType === 'want' &&
           suggestedItem.listingType === 'offer' && suggestedItem.ownerId !== currentUserId) {
    tradeId = `trade-${currentUserId}-wants-${suggestedItem.id}-from-${suggestedItem.ownerId}`; // CurrentUser wants suggestedItem
    chatButtonText = `Discuss Acquiring ${suggestedItemOwner.name}'s "${suggestedItem.name}" for Your Want`;
  }
  // Scenario 5: Viewing someone else's item (mainItem, offer), AI suggests a want from another user (suggestedItem, want) that could be fulfilled by mainItem.
  // This is a 3rd party scenario. User should contact mainItem.owner.
  else if (mainItem.ownerId !== currentUserId && mainItem.listingType === 'offer' &&
           suggestedItem.ownerId !== currentUserId && suggestedItem.listingType === 'want') {
    negotiationContextValid = false;
    chatButtonText = "View Items to Explore Options";
  }
  // Default/fallback (e.g., two 'wants', or other complex cases not directly actionable by current user via one button)
  else {
      negotiationContextValid = false;
      chatButtonText = "View Items for Details";
  }


  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card>
        <CardHeader className="text-center">
          <Link2 className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle className="font-headline text-3xl">Trade Opportunity</CardTitle>
          <CardDescription className="font-body">
            AI suggests a potential match. Review the items and decide your next step.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <OpportunityItemDisplay item={mainItem} owner={mainItemOwner} label={mainItemDisplayLabel} itemTypeLabel={mainItemTypeLabel} />
            <div className="hidden md:flex flex-col items-center justify-center h-full pt-16">
                <ArrowRightLeft className="h-12 w-12 text-muted-foreground my-4" />
                <Badge variant="secondary">Potential Match</Badge>
            </div>
            <div className="md:hidden my-4"> <Separator /> </div>
            <OpportunityItemDisplay item={suggestedItem} owner={suggestedItemOwner} label={suggestedItemDisplayLabel} itemTypeLabel={suggestedItemTypeLabel} />
          </div>
          <Separator />
          <div className="text-center">
            <h3 className="font-headline text-xl mb-2">Next Steps</h3>
            {negotiationContextValid && tradeId ? (
                 <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href={`/trades/${tradeId}`}>
                        <MessageSquare className="mr-2 h-5 w-5" /> {chatButtonText}
                    </Link>
                </Button>
            ) : (
                <div className="space-y-2">
                    <p className="text-muted-foreground font-body">
                        This opportunity may involve items from multiple other users or a different trade dynamic.
                        Please visit the individual item pages to initiate contact or explore further.
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Button asChild><Link href={`/items/${mainItem.id}`}>View {mainItem.name}</Link></Button>
                        <Button asChild><Link href={`/items/${suggestedItem.id}`}>View {suggestedItem.name}</Link></Button>
                    </div>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
