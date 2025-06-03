
import type { Item, User, UserMotivation, TradeTimingPreference, UserProfilePreferences, UserStoredLocation, UserLogisticsPreferences, ItemLogistics, ItemLogisticsShippingOption } from '@/types';
import type { InferredUserPreferences } from '@/types';

export const dummyUsers: User[] = [
  {
    id: 'user1',
    name: 'Alice Trader',
    avatarUrl: 'https://placehold.co/100x100.png?text=A',
    dataAiHint: 'profile avatar',
    rating: 4.5,
    tradesCompleted: 12,
    bio: 'Loves vintage books and handmade crafts. Always open for a fair trade!',
    items: [],
    interestedInThirdPartyFulfillment: true,
    motivations: ['unique-finds', 'community-building'] as UserMotivation[],
    locationPreference: { isSensitive: false },
    tradeTimingPreference: 'flexible' as TradeTimingPreference,
    minimumMatchRating: 'Medium',
    locations: [
      { id: 'user1_home', name: 'Home', address: '123 Main St, Anytown', isDefault: true },
      { id: 'user1_work', name: 'Office', address: '456 Business Rd, Anytown' },
    ],
    logisticsPreferences: {
      defaultShippingOption: 'ship_domestic',
      preferredStoredLocationId: 'user1_home',
    },
  },
  {
    id: 'user2',
    name: 'Bob Barterer',
    avatarUrl: 'https://placehold.co/100x100.png?text=B',
    dataAiHint: 'profile avatar',
    rating: 4.8,
    tradesCompleted: 25,
    bio: 'Electronics enthusiast and collector of rare video games.',
    items: [],
    interestedInThirdPartyFulfillment: false,
    motivations: ['maximize-trades'] as UserMotivation[],
    locationPreference: { isSensitive: true, notes: 'Prefers trades within the city for larger items.' },
    tradeTimingPreference: 'simultaneous' as TradeTimingPreference,
    minimumMatchRating: 'Low',
    locations: [
      { id: 'user2_apt', name: 'Apartment', address: '789 Central Ave, Anytown', isDefault: true },
    ],
    logisticsPreferences: {
      defaultShippingOption: 'pickup_only',
      preferredStoredLocationId: 'user2_apt',
    },
  },
  {
    id: 'user3',
    name: 'Charlie Swapper',
    avatarUrl: 'https://placehold.co/100x100.png?text=C',
    dataAiHint: 'profile avatar',
    rating: 4.2,
    tradesCompleted: 8,
    bio: 'Into sustainable fashion and upcycled goods. Let\'s make a deal!',
    items: [],
    interestedInThirdPartyFulfillment: true,
    motivations: ['help-others', 'convenience-focused'] as UserMotivation[],
    locationPreference: { isSensitive: false },
    tradeTimingPreference: 'staged' as TradeTimingPreference,
    minimumMatchRating: 'Low',
    logisticsPreferences: {
      defaultShippingOption: 'delivery_area', 
    },
  },
  {
    id: 'user4',
    name: 'Diana Doodad',
    avatarUrl: 'https://placehold.co/100x100.png?text=D',
    dataAiHint: 'profile avatar',
    rating: 4.6,
    tradesCompleted: 15,
    bio: 'Collector of quirky antiques and vintage clothing. Always on the lookout for unique pieces.',
    items: [],
    interestedInThirdPartyFulfillment: false,
    motivations: ['unique-finds'] as UserMotivation[],
    locationPreference: { isSensitive: true, notes: 'Willing to ship smaller items.' },
    tradeTimingPreference: 'flexible' as TradeTimingPreference,
    minimumMatchRating: 'High',
    logisticsPreferences: {
      defaultShippingOption: 'possible_delivery', 
    }
  },
  {
    id: 'user5',
    name: 'Ethan Exchange',
    avatarUrl: 'https://placehold.co/100x100.png?text=E',
    dataAiHint: 'profile avatar',
    rating: 4.9,
    tradesCompleted: 30,
    bio: 'Sports gear and outdoor equipment fanatic. Ready to trade for my next adventure!',
    items: [],
    interestedInThirdPartyFulfillment: true,
    motivations: ['maximize-trades', 'convenience-focused'] as UserMotivation[],
    locationPreference: { isSensitive: false },
    tradeTimingPreference: 'simultaneous' as TradeTimingPreference,
    minimumMatchRating: 'Medium',
    logisticsPreferences: {
        defaultShippingOption: 'pickup_only',
    }
  },
];

export let dummyItems: Item[] = [
  {
    id: 'item1',
    name: 'Vintage Leather Journal',
    description: 'A beautifully crafted leather-bound journal, perfect for sketching or writing. Slightly used but in great condition.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'vintage journal',
    category: 'Books & Stationery',
    ownerId: 'user1',
    ownerName: 'Alice Trader',
    status: 'available',
    listingType: 'offer',
    minimumMatchRatingOverride: 'High',
    isGiftItForward: false,
    logistics: {
      locationType: 'profile_stored_location',
      selectedUserStoredLocationId: 'user1_home',
      shippingOption: 'ship_domestic',
      notes: "Can also meet downtown on weekdays."
    }
  },
  {
    id: 'item2',
    name: 'Retro Gaming Console',
    description: 'A classic gaming console from the 90s, comes with two controllers and a few popular game cartridges. Works perfectly.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'gaming console',
    category: 'Electronics',
    ownerId: 'user2',
    ownerName: 'Bob Barterer',
    status: 'available',
    listingType: 'offer',
    isGiftItForward: false,
    logistics: {
      locationType: 'item_specific_location',
      itemSpecificAddress: 'Storage Unit #15, SelfStore Co.',
      shippingOption: 'pickup_only',
    }
  },
  {
    id: 'item3',
    name: 'Hand-knitted Scarf (Gift It Forward!)',
    description: 'A cozy and stylish scarf, hand-knitted with high-quality merino wool. Vibrant colors, brand new. Happy to gift this to someone who will love it!',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'knitted scarf',
    category: 'Fashion & Accessories',
    ownerId: 'user1',
    ownerName: 'Alice Trader',
    status: 'available',
    listingType: 'offer',
    isGiftItForward: true,
    logistics: {
      locationType: 'profile_stored_location',
      selectedUserStoredLocationId: 'user1_home',
      shippingOption: 'ship_domestic',
    }
  },
  {
    id: 'item4',
    name: 'Portable Bluetooth Speaker',
    description: 'Compact and powerful Bluetooth speaker with excellent sound quality and long battery life. Like new.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'bluetooth speaker',
    category: 'Electronics',
    ownerId: 'user2',
    ownerName: 'Bob Barterer',
    status: 'pending',
    listingType: 'offer',
    isGiftItForward: false,
    logistics: {
      locationType: 'profile_stored_location',
      selectedUserStoredLocationId: 'user2_apt',
      shippingOption: 'pickup_only',
    }
  },
  {
    id: 'item5',
    name: 'Set of 5 Succulent Plants',
    description: 'A collection of five healthy and thriving succulent plants in cute ceramic pots. Easy to care for.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'succulent plants',
    category: 'Home & Garden',
    ownerId: 'user3',
    ownerName: 'Charlie Swapper',
    status: 'available',
    listingType: 'offer',
    isGiftItForward: false,
     logistics: {
      locationType: 'item_specific_location',
      itemSpecificAddress: "Charlie's Balcony Garden",
      shippingOption: 'delivery_area', 
    }
  },
  {
    id: 'item6',
    name: 'Upcycled Denim Tote Bag',
    description: 'A unique and durable tote bag made from recycled denim. Stylish and eco-friendly.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'denim bag',
    category: 'Fashion & Accessories',
    ownerId: 'user3',
    ownerName: 'Charlie Swapper',
    status: 'traded',
    listingType: 'offer',
    isGiftItForward: false,
     logistics: { // Added example logistics for a traded item
      locationType: 'item_specific_location',
      itemSpecificAddress: "Charlie's Workshop",
      shippingOption: 'ship_domestic',
    }
  },
  {
    id: 'item7',
    name: 'Looking for: First Edition Sci-Fi Novel',
    description: 'Seeking a first edition copy of "Dune" by Frank Herbert. Must be in good or very good condition. Willing to trade valuable collectibles.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'book search',
    category: 'Books & Stationery',
    ownerId: 'user1',
    ownerName: 'Alice Trader',
    status: 'available',
    listingType: 'want',
    minimumMatchRatingOverride: 'Medium',
    logistics: { // Wants can also have logistics if it implies how they'd receive
      locationType: 'profile_stored_location',
      selectedUserStoredLocationId: 'user1_home',
      shippingOption: 'ship_domestic', // Means they are okay with it being shipped to them
    }
  },
  {
    id: 'item8',
    name: 'Wanted: Specific Model Digital Camera',
    description: 'I am looking for a Fujifilm X100V digital camera, any color, in good working condition. Open to discussing trades for my electronics.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'camera search',
    category: 'Electronics',
    ownerId: 'user2',
    ownerName: 'Bob Barterer',
    status: 'available',
    listingType: 'want',
    logistics: {
      locationType: 'profile_stored_location',
      selectedUserStoredLocationId: 'user2_apt',
      shippingOption: 'pickup_only', // Means they want to pick it up
    }
  },
  {
    id: 'item9',
    name: 'Vintage Fedora Hat',
    description: 'A stylish vintage fedora hat from the 1950s. Wool felt, in excellent condition for its age. Size medium.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'vintage hat',
    category: 'Fashion & Accessories',
    ownerId: 'user4',
    ownerName: 'Diana Doodad',
    status: 'available',
    listingType: 'offer',
    isGiftItForward: false,
    logistics: {
        locationType: 'item_specific_location',
        itemSpecificAddress: "Diana's Boutique",
        shippingOption: 'possible_delivery', 
    }
  },
  {
    id: 'item10',
    name: 'Wanted: Rare 1980s Comic Book',
    description: 'Looking for a specific issue of "The Uncanny X-Men" from the mid-1980s to complete my collection. Must be graded 8.0 or higher.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'comic book',
    category: 'Collectibles',
    ownerId: 'user4',
    ownerName: 'Diana Doodad',
    status: 'available',
    listingType: 'want',
    logistics: {
        locationType: 'item_specific_location', // User 4 doesn't have stored locations in this dummy data
        itemSpecificAddress: 'Diana Doodad Wants This Shipped To: 12Collector Lane',
        shippingOption: 'ship_international',
    }
  },
  {
    id: 'item11',
    name: '4-Person Camping Tent (Gift It Forward!)',
    description: 'Spacious 4-person dome tent. Used twice, in great condition. Includes rainfly and carrying bag. Perfect for family camping trips. Offering this as a gift to a good home!',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'camping tent',
    category: 'Sporting Goods',
    ownerId: 'user5',
    ownerName: 'Ethan Exchange',
    status: 'available',
    listingType: 'offer',
    isGiftItForward: true,
    logistics: {
        locationType: 'item_specific_location',
        itemSpecificAddress: "Ethan's Garage",
        shippingOption: 'pickup_only',
    }
  },
  {
    id: 'item12',
    name: 'Adjustable Dumbbell Set (5-50 lbs)',
    description: 'Set of adjustable dumbbells, replaces multiple individual weights. Goes from 5 to 50 lbs. Excellent for home workouts.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'dumbbell set',
    category: 'Sporting Goods',
    ownerId: 'user5',
    ownerName: 'Ethan Exchange',
    status: 'pending',
    listingType: 'offer',
    isGiftItForward: false,
    logistics: {
        locationType: 'item_specific_location',
        itemSpecificAddress: "Ethan's Home Gym",
        shippingOption: 'pickup_only',
    }
  },
  {
    id: 'item13',
    name: 'Collection of Classic Rock Vinyl Records',
    description: 'About 50 vinyl records from classic rock bands of the 70s and 80s. Mixed condition, some rare finds.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'vinyl records',
    category: 'Collectibles',
    ownerId: 'user1',
    ownerName: 'Alice Trader',
    status: 'available',
    listingType: 'offer',
    isGiftItForward: false,
    logistics: {
      locationType: 'profile_stored_location',
      selectedUserStoredLocationId: 'user1_work',
      shippingOption: 'ship_domestic',
    }
  },
  {
    id: 'item14',
    name: 'Wanted: Beginner Skateboard',
    description: 'Looking for a complete beginner-friendly skateboard for an adult. Good condition, nothing too fancy. Willing to trade handmade items.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'skateboard search',
    category: 'Sporting Goods',
    ownerId: 'user3',
    ownerName: 'Charlie Swapper',
    status: 'available',
    listingType: 'want',
    logistics: {
        locationType: 'item_specific_location', // Charlie has no stored locations
        itemSpecificAddress: "Charlie Swapper wants this delivered locally if possible.",
        shippingOption: 'delivery_area',
    }
  }
];

dummyUsers.forEach(user => {
  user.items = dummyItems.filter(item => item.ownerId === user.id);
});

dummyItems.forEach(item => {
  const owner = dummyUsers.find(user => user.id === item.ownerId);
  if (owner) {
    item.ownerName = owner.name;
  }
});

export function updateUserPreferencesInDummyData(
  userId: string,
  newPreferences: InferredUserPreferences
): boolean {
  const userIndex = dummyUsers.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    console.warn(`[DummyData] User with ID ${userId} not found for preference update.`);
    return false;
  }

  const userToUpdate = dummyUsers[userIndex];

  if (newPreferences.motivations !== undefined) {
    userToUpdate.motivations = newPreferences.motivations;
  }
  if (newPreferences.locationPreference !== undefined) {
    userToUpdate.locationPreference = newPreferences.locationPreference;
  }
  if (newPreferences.tradeTimingPreference !== undefined) {
    userToUpdate.tradeTimingPreference = newPreferences.tradeTimingPreference;
  }
  if (newPreferences.interestedInThirdPartyFulfillment !== undefined) {
    userToUpdate.interestedInThirdPartyFulfillment = newPreferences.interestedInThirdPartyFulfillment;
  }
  userToUpdate.minimumMatchRating = newPreferences.minimumMatchRating;

  dummyUsers[userIndex] = userToUpdate;
  return true;
}

export function addNewItemToDummyData(
  itemData: Omit<Item, 'id' | 'ownerName' | 'status' | 'dataAiHint'> & { ownerId: string }
): Item {
  const owner = dummyUsers.find(user => user.id === itemData.ownerId);
  if (!owner) {
    console.error(`[DummyData] Owner with ID ${itemData.ownerId} not found. Cannot add item.`);
    throw new Error(`Owner not found for ID: ${itemData.ownerId}`);
  }

  let finalLogistics: ItemLogistics;
  if (itemData.logistics) { // This case should now always be true from the form
    finalLogistics = {
        locationType: itemData.logistics.locationType,
        selectedUserStoredLocationId: itemData.logistics.locationType === 'profile_stored_location' ? itemData.logistics.selectedUserStoredLocationId : undefined,
        itemSpecificAddress: itemData.logistics.locationType === 'item_specific_location' ? itemData.logistics.itemSpecificAddress : undefined,
        shippingOption: itemData.logistics.shippingOption,
        notes: itemData.logistics.notes,
    };
  } else {
    // Fallback - should ideally not be hit if form sends full logistics
    let defaultLocType: 'profile_stored_location' | 'item_specific_location' = 'item_specific_location';
    let defaultStoredId: string | undefined = undefined;
    if (owner.logisticsPreferences?.preferredStoredLocationId && owner.locations?.find(l => l.id === owner.logisticsPreferences?.preferredStoredLocationId)) {
        defaultLocType = 'profile_stored_location';
        defaultStoredId = owner.logisticsPreferences.preferredStoredLocationId;
    } else if (owner.locations && owner.locations.length > 0 && owner.locations[0]?.id) {
        defaultLocType = 'profile_stored_location';
        defaultStoredId = owner.locations[0].id;
    }

    finalLogistics = {
        locationType: defaultLocType,
        selectedUserStoredLocationId: defaultStoredId,
        itemSpecificAddress: defaultLocType === 'item_specific_location' ? 'Default Address Needed' : undefined,
        shippingOption: owner.logisticsPreferences?.defaultShippingOption || 'pickup_only',
        notes: '',
    };
  }


  const newItem: Item = {
    ...itemData,
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ownerName: owner.name,
    status: 'available',
    dataAiHint: itemData.name.toLowerCase().split(' ').slice(0, 2).join(' ') || 'new item',
    imageUrl: itemData.imageUrl || `https://placehold.co/600x400.png?text=${encodeURIComponent(itemData.name.substring(0,15))}`,
    isGiftItForward: itemData.listingType === 'offer' ? (itemData.isGiftItForward || false) : false,
    logistics: finalLogistics,
  };

  dummyItems.push(newItem);

  const userIndex = dummyUsers.findIndex(u => u.id === itemData.ownerId);
  if (userIndex !== -1) {
    dummyUsers[userIndex].items.push(newItem);
  }

  console.log('[DummyData] Added new item:', newItem);
  console.log('[DummyData] Total items now:', dummyItems.length);
  return newItem;
}
