
'use client';

import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import type { Item } from '@/types';
import Link from 'next/link';
import { dummyUsers } from '@/lib/dummy-data'; // To get current user ID for tradeId

interface ItemTradeInitiationContentProps {
  item: Item;
  ownerName: string;
  ownerId: string;
}

export default function ItemTradeInitiationContent({ item, ownerName, ownerId }: ItemTradeInitiationContentProps) {
  // Simulate current user - in a real app, this would come from auth context
  const currentUserId = dummyUsers[0]?.id || 'currentUserPlaceholder'; 
  
  // Construct a tradeId. This is a simplified version.
  // A real app might involve a backend call to create a trade record and get an ID.
  // For this demo, we make it somewhat unique based on participants and item.
  // Let's assume the item being viewed is what the other user is offering.
  const tradeId = `trade-${currentUserId}-wants-${item.id}-from-${ownerId}`;

  return (
    <>
      <p className="text-sm font-body text-muted-foreground mb-4">
        Start a conversation with {ownerName} to negotiate a trade for "{item.name}".
      </p>
      <Button
        asChild
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        size="lg"
      >
        <Link href={`/trades/${tradeId}`}>
          <MessageSquare className="mr-2 h-5 w-5" />
          Open Negotiation Chat
        </Link>
      </Button>
    </>
  );
}
