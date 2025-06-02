'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, X } from 'lucide-react';
import ChatWindow from '@/components/chat/ChatWindow';
import type { Item } from '@/types';

interface ItemTradeInitiationContentProps {
  item: Item;
  ownerName: string;
  ownerId: string;
}

export default function ItemTradeInitiationContent({ item, ownerName, ownerId }: ItemTradeInitiationContentProps) {
  const [showChat, setShowChat] = useState(false);

  // This tradeId is a simple deterministic ID for client-side chat session initiation.
  // A real application might generate this ID via a backend call upon starting a trade.
  const tradeId = `chat-for-${item.id}-with-${ownerId}`;

  return (
    <>
      <p className="text-sm font-body text-muted-foreground mb-4">
        Start a conversation with {ownerName} to negotiate a trade for {item.name}.
      </p>
      <Button
        onClick={() => setShowChat(!showChat)}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
        size="lg"
      >
        {showChat ? <X className="mr-2 h-5 w-5" /> : <MessageSquare className="mr-2 h-5 w-5" />}
        {showChat ? 'Close Negotiation Chat' : 'Start Trade Negotiation'}
      </Button>

      {showChat && (
        <div className="mt-4">
          <ChatWindow
            currentItem={item} // The item being viewed, used as context for the chat
            otherUserId={ownerId}
            otherUserName={ownerName}
            tradeId={tradeId}
            // requestedItemInitial is optional and not provided here as negotiation starts fresh
          />
        </div>
      )}
    </>
  );
}
