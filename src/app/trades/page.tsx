import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Repeat, CheckCircle, XCircle, Hourglass } from 'lucide-react';
import type { TradeOffer } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// Dummy trade data
const dummyTrades: TradeOffer[] = [
  {
    id: 'trade1',
    offeringUserId: 'user1',
    receivingUserId: 'user2',
    offeredItemId: 'item1',
    requestedItemId: 'item2',
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
    updatedAt: new Date(Date.now() - 86400000 * 1), // 1 day ago
  },
  {
    id: 'trade2',
    offeringUserId: 'user3',
    receivingUserId: 'user1',
    offeredItemId: 'item5',
    requestedItemId: 'item3',
    status: 'accepted',
    createdAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
    updatedAt: new Date(Date.now() - 86400000 * 3), // 3 days ago
  },
  {
    id: 'trade3',
    offeringUserId: 'user2',
    receivingUserId: 'user3',
    offeredItemId: 'item4', // Pending item
    requestedItemId: 'itemX', // An item Charlie might have
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000 * 10), // 10 days ago
    updatedAt: new Date(Date.now() - 86400000 * 7), // 7 days ago
  },
    {
    id: 'trade4',
    offeringUserId: 'user1',
    receivingUserId: 'user3',
    offeredItemId: 'itemY',
    requestedItemId: 'itemZ',
    status: 'rejected',
    createdAt: new Date(Date.now() - 86400000 * 4),
    updatedAt: new Date(Date.now() - 86400000 * 4),
  },
];

const StatusIcon = ({ status }: { status: TradeOffer['status'] }) => {
  switch (status) {
    case 'pending': return <Hourglass className="h-5 w-5 text-yellow-500" />;
    case 'accepted': return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
    case 'completed': return <CheckCircle className="h-5 w-5 text-blue-500" />;
    case 'cancelled': return <XCircle className="h-5 w-5 text-gray-500" />;
    default: return <Hourglass className="h-5 w-5 text-gray-500" />;
  }
};

export default function TradesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-2">
            <Repeat className="h-8 w-8 text-primary" />
            My Trades
          </CardTitle>
          <CardDescription className="font-body">
            Keep track of your ongoing and completed trade negotiations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dummyTrades.length === 0 ? (
            <p className="text-center text-muted-foreground font-body py-8">You have no active or past trades yet.</p>
          ) : (
            <div className="space-y-4">
              {dummyTrades.map((trade) => (
                <Card key={trade.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusIcon status={trade.status} />
                        <h3 className="font-headline text-lg">
                          Trade with {trade.receivingUserId === 'user1' ? trade.offeringUserId : trade.receivingUserId} {/* Simplification */}
                        </h3>
                        <Badge variant={
                            trade.status === 'completed' ? 'default' :
                            trade.status === 'accepted' ? 'default' :
                            trade.status === 'pending' ? 'secondary' :
                            'destructive'
                        } className="capitalize ml-auto sm:ml-2 py-1 px-2 text-xs">
                            {trade.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-body">
                        Offering Item ID: {trade.offeredItemId} for Item ID: {trade.requestedItemId}
                      </p>
                      <p className="text-xs text-muted-foreground font-body">
                        Last updated: {new Date(trade.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/trades/${trade.id}`}>View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
