// This is a placeholder page for a specific trade.
// In a real application, this page would show trade details, item comparison, and the chat window.
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Repeat, Info } from 'lucide-react';
import { dummyItems } from '@/lib/dummy-data';
import Image from 'next/image';
import ChatWindow from '@/components/chat/ChatWindow';

export default function TradeDetailPage({ params }: { params: { tradeId: string } }) {
  // Fetch trade details based on params.tradeId
  // For now, using dummy data/placeholders
  const tradeId = params.tradeId;
  const itemOffered = dummyItems[0]; // Placeholder
  const itemRequested = dummyItems[1]; // Placeholder
  const otherUser = { id: 'user2', name: 'Bob Barterer' }; // Placeholder

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-2">
            <Repeat className="h-8 w-8 text-primary" />
            Trade Details: #{tradeId}
          </CardTitle>
          <CardDescription className="font-body">
            Negotiating trade for <span className="font-semibold">{itemOffered.name}</span> with <span className="font-semibold">{otherUser.name}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="font-headline text-xl">You Offer</CardTitle></CardHeader>
              <CardContent>
                <div className="relative aspect-video w-full mb-2">
                    <Image src={itemOffered.imageUrl} alt={itemOffered.name} layout="fill" objectFit="cover" className="rounded-md" data-ai-hint={itemOffered.dataAiHint || "item offered"}/>
                </div>
                <h4 className="font-semibold">{itemOffered.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">{itemOffered.description}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-headline text-xl">They Offer / You Request</CardTitle></CardHeader>
              <CardContent>
                 <div className="relative aspect-video w-full mb-2">
                    <Image src={itemRequested.imageUrl} alt={itemRequested.name} layout="fill" objectFit="cover" className="rounded-md" data-ai-hint={itemRequested.dataAiHint || "item requested"}/>
                </div>
                <h4 className="font-semibold">{itemRequested.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">{itemRequested.description}</p>
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
            currentItem={itemOffered} 
            requestedItemInitial={itemRequested} // This can be a starting point or null
            otherUserId={otherUser.id}
            otherUserName={otherUser.name}
            tradeId={tradeId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
