
import type { Item } from '@/types';
import ItemCard from './ItemCard';

interface ItemListProps {
  items: (Item & { matchScore?: string; isThirdPartyFulfillment?: boolean })[];
}

export default function ItemList({ items }: ItemListProps) {
  if (!items || items.length === 0) {
    return <p className="text-center text-muted-foreground font-body py-8">No items found. Try adjusting your search or filters!</p>;
  }

  return (
    <div className="flex flex-row items-stretch overflow-x-auto space-x-3 py-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-5 md:space-x-0 md:py-0">
      {items.map((item) => (
        <div key={item.id} className="min-w-[150px] w-[150px] md:min-w-0 md:w-full h-full">
          <ItemCard item={item} />
        </div>
      ))}
    </div>
  );
}
