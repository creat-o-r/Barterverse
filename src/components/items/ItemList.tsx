
import type { Item } from '@/types';
import ItemCard from './ItemCard';

interface ItemListProps {
  items: (Item & { matchScore?: string })[]; // Items can now have an optional matchScore
  mainContextItemId?: string; // ID of the item for which these are suggestions, for opportunity links
}

export default function ItemList({ items, mainContextItemId }: ItemListProps) {
  if (!items || items.length === 0) {
    return <p className="text-center text-muted-foreground font-body py-8">No items found. Try adjusting your search or filters!</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {items.map((item) => (
        <div key={item.id} className="h-full">
          <ItemCard
            item={item}
            matchScore={item.matchScore} // Pass the score from the item object
            opportunityContextItemId={mainContextItemId} // Pass the ID for opportunity context
          />
        </div>
      ))}
    </div>
  );
}
