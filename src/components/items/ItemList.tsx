
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

  // Adjusted className for more flexibility:
  // - 기본적으로 가로 스크롤을 위한 flex row.
  // - md 이상에서는 flex-wrap을 사용하여 여러 줄로 표시될 수 있도록 하고, gap으로 간격 조정.
  // - grid 레이아웃은 부모 컴포넌트에서 필요에 따라 적용 가능.
  return (
    <div className="flex flex-row items-stretch overflow-x-auto space-x-3 py-3 md:flex-wrap md:gap-5 md:space-x-0 md:py-0">
      {items.map((item) => (
        <div key={item.id} className="min-w-[150px] w-[150px] md:min-w-0 md:w-auto md:flex-[1_0_calc(33.333%-1.25rem)] lg:flex-[1_0_calc(25%-1.25rem)] h-full">
          {/* Adjust flex-basis for desired number of items per row on larger screens */}
          {/* Example: calc(50%-0.625rem) for 2 items, calc(33.333%-0.833rem) for 3 items, calc(25%-0.9375rem) for 4 items, considering gap */}
          <ItemCard item={item} mainContextItemId={mainContextItemId} />
        </div>
      ))}
    </div>
  );
}

