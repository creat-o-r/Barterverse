
import type { Item } from '@/types';
import ItemCard from './ItemCard';

interface ItemListProps {
  items: (Item & { matchScore?: string; isThirdPartyFulfillment?: boolean })[];
  mainContextItemId?: string; // For passing to ItemCard when these items are suggestions
}

export default function ItemList({ items, mainContextItemId }: ItemListProps) {
  if (!items || items.length === 0) {
    return <p className="text-center text-muted-foreground font-body py-8">No items found. Try adjusting your search or filters!</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {items.map((item) => (
        <div key={item.id} className="h-full"> {/* Ensure cards in a row take full height if needed by content */}
          <ItemCard item={item} mainContextItemId={mainContextItemId} />
        </div>
      ))}
    </div>
  );
}

