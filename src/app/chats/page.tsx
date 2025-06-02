
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Repeat, CheckCircle, XCircle, Hourglass } from 'lucide-react';
import type { TradeOffer } from '@/types'; // Assuming types are in @/types
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { dummyItems } from '@/lib/dummy-data'; // To get item names

// Reusing dummyTrades for now, ideally this comes from a service
const dummyTrades: TradeOffer[] = [
  {
    id: 'trade1',
    offeringUserId: 'user1', // Assume current user is user1
    receivingUserId: 'user2',
    offeredItemId: 'item1',
    requestedItemId: 'item2',
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 2),
    updatedAt: new Date(Date.now() - 86400000 * 1),
  },
  {
    id: 'trade2',
    offeringUserId: 'user3',
    receivingUserId: 'user1', // Assume current user is user1
    offeredItemId: 'item5',
    requestedItemId: 'item3',
    status: 'accepted',
    createdAt: new Date(Date.now() - 86400000 * 5),
    updatedAt: new Date(Date.now() - 86400000 * 3),
  },
   {
    id: 'trade3',
    offeringUserId: 'user1',
    receivingUserId: 'user3',
    offeredItemId: 'item4',
    requestedItemId: 'itemX',
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 1),
    updatedAt: new Date(),
  },
  {
    id: 'trade4',
    offeringUserId: 'user2',
    receivingUserId: 'user1',
    offeredItemId: 'itemY',
    requestedItemId: 'itemZ',
    status: 'completed', // Will be filtered out
    createdAt: new Date(Date.now() - 86400000 * 4),
    updatedAt: new Date(Date.now() - 86400000 * 4),
  },
];

// Helper to get item name
const getItemName = (itemId: string) => dummyItems.find(item => item.id === itemId)?.name || 'Unknown Item';

// Helper to get user name (simplified)
const getUserName = (userId: string, currentUserId: string) => {
    if (userId === currentUserId) return "You";
    // In a real app, fetch user names based on ID
    if (userId === 'user1') return "Alice Trader";
    if (userId === 'user2') return "Bob Barterer";
    if (userId === 'user3') return "Charlie Swapper";
    return `User (${userId.substring(0,4)})`;
}

const StatusIcon = ({ status }: { status: TradeOffer['status'] }) => {
  switch (status) {
    case 'pending': return <Hourglass className="h-5 w-5 text-yellow-500" />;
    case 'accepted': return <CheckCircle className="h-5 w-5 text-green-500" />;
    // Other statuses might not be relevant for "active chats" page
    default: return <MessageSquare className="h-5 w-5 text-gray-500" />;
  }
};

export default function ChatsPage() {
  // Simulate current user, in a real app this comes from auth
  const currentUserId = 'user1'; 

  const activeChats = dummyTrades.filter(trade => 
    (trade.offeringUserId === currentUserId || trade.receivingUserId === currentUserId) &&
    (trade.status === 'pending' || trade.status === 'accepted')
  );

  return (
    <div className="max-w-3xl mx-auto">
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
                const otherPartyId = trade.offeringUserId === currentUserId ? trade.receivingUserId : trade.offeringUserId;
                const otherPartyName = getUserName(otherPartyId, currentUserId);
                const userIsOffering = trade.offeringUserId === currentUserId;

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
                        <p className="text-sm text-muted-foreground font-body line-clamp-1">
                          {userIsOffering ? 
                            `Your offer: ${getItemName(trade.offeredItemId)} for Their: ${getItemName(trade.requestedItemId)}` :
                            `Their offer: ${getItemName(trade.offeredItemId)} for Your: ${getItemName(trade.requestedItemId)}`
                          }
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
    </div>
  );
}
