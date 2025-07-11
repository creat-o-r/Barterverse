
'use client'; // Moved to the top

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Repeat, CheckCircle, XCircle, Hourglass, Bot } from 'lucide-react';
import type { TradeOffer } from '@/types'; 
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { dummyItems, dummyUsers } from '@/lib/dummy-data'; 

import GeneralChatWindow from '@/components/chat/GeneralChatWindow';
import { Separator } from '@/components/ui/separator';
import PrivateRoute from '@/components/auth/PrivateRoute'; // Import PrivateRoute
import { useAuth } from '@/contexts/AuthContext'; // To get current user

// Reusing dummyTrades for now, ideally this comes from a service
const dummyTrades: TradeOffer[] = [
  {
    id: 'trade-user1-wants-item2-from-user2', // Alice wants Bob's Retro Gaming Console
    offeringUserId: 'user2', // Bob is "offering" item2
    receivingUserId: 'user1', // Alice is "receiving" item2 if trade succeeds
    offeredItemId: 'item2', // The item Bob has
    requestedItemId: 'item3', // What Alice might offer in return (Hand-knitted Scarf)
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 86400000 * 1),
  },
  {
    id: 'trade-user1-wants-item5-from-user3', // Alice wants Charlie's Succulents
    offeringUserId: 'user3', // Charlie is "offering" item5
    receivingUserId: 'user1', // Alice is "receiving" item5
    offeredItemId: 'item5', // The item Charlie has
    requestedItemId: 'item1', // What Alice might offer (Vintage Journal)
    status: 'accepted',
    createdAt: new Date(Date.now() - 86400000 * 5),
    updatedAt: new Date(Date.now() - 86400000 * 3),
  },
   {
    id: 'trade-user1-wants-item9-from-user4', // Alice wants Diana's Fedora Hat
    offeringUserId: 'user4', // Diana has item9
    receivingUserId: 'user1', // Alice wants item9
    offeredItemId: 'item9', // Diana's Fedora
    requestedItemId: 'item13', // Alice offers Vinyl Records
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 1),
    updatedAt: new Date(),
  },
  {
    id: 'trade-user2-wants-item1-from-user1', // Bob wants Alice's Vintage Journal
    offeringUserId: 'user1', // Alice has item1
    receivingUserId: 'user2', // Bob wants item1
    offeredItemId: 'item1',
    requestedItemId: 'item4', // Bob offers Bluetooth speaker
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 0.5),
    updatedAt: new Date(Date.now() - 86400000 * 0.2),
  },
];

// Helper to get item name
const getItemName = (itemId: string) => dummyItems.find(item => item.id === itemId)?.name || 'Unknown Item';

// Helper to get user name (simplified)
const getUserName = (userId: string, currentUserId: string) => {
    if (userId === currentUserId) return "You";
    return dummyUsers.find(user => user.id === userId)?.name || `User (${userId.substring(0,4)})`;
}

const StatusIcon = ({ status }: { status: TradeOffer['status'] }) => {
  switch (status) {
    case 'pending': return <Hourglass className="h-5 w-5 text-yellow-500" />;
    case 'accepted': return <CheckCircle className="h-5 w-5 text-green-500" />;
    default: return <MessageSquare className="h-5 w-5 text-gray-500" />;
  }
};

function ChatsPageContent() {
  const { currentUser } = useAuth(); // Get the authenticated user

  // If currentUser is null or loading, PrivateRoute would ideally handle it.
  // But if we reach here and it's null, it's an issue or still loading.
  // For now, we'll assume PrivateRoute has done its job and currentUser is available.
  // If not, the page might show errors or incorrect data.
  // A robust implementation might show a loading spinner here too if currentUser is null and auth is still loading.
  const currentUserId = currentUser ? currentUser.uid : null;


  if (!currentUserId) {
    // This should ideally not be reached if PrivateRoute is working correctly.
    // It serves as a fallback or indicates that PrivateRoute might not be used at the top level of this page yet.
    return <div className="text-center py-10">Please sign in to view your chats.</div>;
  }

  const activeChats = dummyTrades.filter(trade => 
    (trade.offeringUserId === currentUserId || trade.receivingUserId === currentUserId) &&
    (trade.status === 'pending' || trade.status === 'accepted')
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Your Trade Chats
          </CardTitle>
          <CardDescription className="font-body">
            Access your ongoing and recent trade negotiations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeChats.length === 0 ? (
            <p className="text-center text-muted-foreground font-body py-10">You have no active trade chats.</p>
          ) : (
            <div className="space-y-4">
              {activeChats.map((trade) => {
                // Determine who the other party is
                const otherPartyId = trade.offeringUserId === currentUserId ? trade.receivingUserId : trade.offeringUserId;
                const otherPartyName = getUserName(otherPartyId, currentUserId);
                
                // Determine what is being offered and requested from the current user's perspective
                let itemCurrentUserOffersName = 'Something';
                let itemOtherUserOffersName = 'Something';

                if (trade.offeringUserId === currentUserId) {
                  // Current user is OFFERING trade.offeredItemId
                  // and REQUESTING trade.requestedItemId from the other user
                  itemCurrentUserOffersName = getItemName(trade.offeredItemId);
                  itemOtherUserOffersName = getItemName(trade.requestedItemId);
                } else { // trade.receivingUserId === currentUserId
                  // Current user is RECEIVING trade.offeredItemId from the other user
                  // and the other user is REQUESTING trade.requestedItemId (which is current user's)
                  itemCurrentUserOffersName = getItemName(trade.requestedItemId);
                  itemOtherUserOffersName = getItemName(trade.offeredItemId);
                }


                return (
                  <Card key={trade.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon status={trade.status} />
                          <h3 className="font-headline text-lg">
                            Chat with {otherPartyName}
                          </h3>
                           <Badge variant={
                                trade.status === 'accepted' ? 'default' :
                                trade.status === 'pending' ? 'secondary' :
                                'outline'
                            } className="capitalize ml-auto sm:ml-2 py-1 px-2 text-xs">
                                {trade.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-body line-clamp-2">
                           {`Your offer: ${itemCurrentUserOffersName} for Their: ${itemOtherUserOffersName}`}
                        </p>
                        <p className="text-xs text-muted-foreground font-body">
                          Last activity: {new Date(trade.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Link href={`/trades/${trade.id}`}>Open Chat</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <Bot className="h-8 w-8 text-accent" />
            Direct Assistant Chat
          </CardTitle>
          <CardDescription className="font-body">
            Have a question or need help? Chat directly with our AI assistant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GeneralChatWindow />
        </CardContent>
      </Card>
    </div>
  );
}

// New default export using PrivateRoute
export default function ChatsPageProtected() {
  return (
    <PrivateRoute>
      <ChatsPageContent />
    </PrivateRoute>
  );
}
