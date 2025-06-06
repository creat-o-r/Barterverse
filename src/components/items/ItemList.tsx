
import type { Item } from '@/types';
import ItemCard from './ItemCard';
import type { AIMatchingMode } from '@/services/ai-config-service';

interface ItemListProps {
  items: (Item & { matchScore?: string; reciprocalItemId?: string })[];
  mainContextItemId?: string;
  usedMatchingMode?: AIMatchingMode;
  preferencesConsidered?: boolean;
}

export default function ItemList({ items, mainContextItemId, usedMatchingMode, preferencesConsidered }: ItemListProps) {
  if (!items || items.length === 0) {
    return <p className="text-center text-muted-foreground font-body py-8">No items found. Try adjusting your search or filters!</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {items.map((item) => (
        <div key={item.id} className="h-full">
          <ItemCard
            item={item}
            opportunityContextItemId={mainContextItemId}
            usedMatchingMode={usedMatchingMode}
            preferencesConsidered={preferencesConsidered}
          />
        </div>
      ))}
    </div>
  );
}
