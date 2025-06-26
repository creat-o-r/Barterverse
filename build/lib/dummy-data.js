"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dummyItems = exports.dummyUsers = void 0;
exports.updateUserPreferencesInDummyData = updateUserPreferencesInDummyData;
exports.addNewItemToDummyData = addNewItemToDummyData;
exports.dummyUsers = [
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
        motivations: ['unique-finds', 'community-building'],
        locationPreference: { isSensitive: false },
        tradeTimingPreference: 'flexible',
        minimumMatchRating: 'Medium',
        locations: [
            { id: 'user1_home', name: 'Home', address: '123 Main St, Anytown', isDefault: true },
            { id: 'user1_work', name: 'Office', address: '456 Business Rd, Anytown' },
        ],
        logisticsPreferences: {
            defaultDeliveryMethods: ['willing_to_ship', 'public_meetup'],
            preferredStoredLocationId: 'user1_home',
            openToChainDelivery: true,
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
        motivations: ['maximize-trades'],
        locationPreference: { isSensitive: true, notes: 'Prefers trades within the city for larger items.' },
        tradeTimingPreference: 'simultaneous',
        minimumMatchRating: 'Low',
        locations: [
            { id: 'user2_apt', name: 'Apartment', address: '789 Central Ave, Anytown', isDefault: true },
        ],
        logisticsPreferences: {
            defaultDeliveryMethods: ['pickup_only'],
            preferredStoredLocationId: 'user2_apt',
            openToChainDelivery: false,
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
        motivations: ['help-others', 'convenience-focused'],
        locationPreference: { isSensitive: false },
        tradeTimingPreference: 'staged',
        minimumMatchRating: 'Low',
        logisticsPreferences: {
            defaultDeliveryMethods: ['public_meetup', 'flexible_meetup'],
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
        motivations: ['unique-finds'],
        locationPreference: { isSensitive: true, notes: 'Willing to ship smaller items.' },
        tradeTimingPreference: 'flexible',
        minimumMatchRating: 'High',
        logisticsPreferences: {
            defaultDeliveryMethods: ['possible_delivery', 'willing_to_ship'],
            openToChainDelivery: true,
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
        motivations: ['maximize-trades', 'convenience-focused'],
        locationPreference: { isSensitive: false },
        tradeTimingPreference: 'simultaneous',
        minimumMatchRating: 'Medium',
        logisticsPreferences: {
            defaultDeliveryMethods: ['flexible_meetup', 'pickup_only'],
            openToChainDelivery: false,
        }
    },
];
exports.dummyItems = [
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
        isGiftItForward: false,
        openToAnyOpportunity: false,
        specifications: {
            "Product Type": "Journal",
            "Material": "Genuine Leather",
            "Binding": "Hand-stitched",
            "Pages": "Approx. 200, unlined cream paper",
            "Size": "A5 (5.8 x 8.3 inches)",
            "Condition": "Slightly used, excellent",
            "Brand": "Artisan Made (Unbranded)",
            "Color": "Dark Brown"
        },
        logistics: {
            locationType: 'profile_stored_location',
            selectedUserStoredLocationId: 'user1_home',
            deliveryMethods: ['willing_to_ship', 'public_meetup'],
            timing: { type: 'flexible' },
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
        openToAnyOpportunity: false,
        specifications: {
            "Product Type": "Gaming Console",
            "Brand": "ConsoleX",
            "Model": "RetroPlay 2000",
            "Includes": "2 controllers, 3 game cartridges (Pixel Adventure, Space Blasters, Retro Racer)",
            "Condition": "Used - Good, fully functional",
            "Output": "AV, RF",
            "Year": "1995"
        },
        logistics: {
            locationType: 'item_specific_location',
            itemSpecificAddress: 'Storage Unit #15, SelfStore Co.',
            deliveryMethods: ['pickup_only'],
            timing: { type: 'fixed_date', date: '2024-07-15' }
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
        openToAnyOpportunity: true,
        specifications: {
            "Product Type": "Scarf",
            "Material": "100% Merino Wool",
            "Color": "Rainbow Stripes",
            "Length": "Approx. 6 feet",
            "Care": "Hand-wash cold",
            "Condition": "New, Handmade"
        },
        logistics: {
            locationType: 'profile_stored_location',
            selectedUserStoredLocationId: 'user1_home',
            deliveryMethods: ['willing_to_ship'],
            timing: { type: 'flexible' }
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
        openToAnyOpportunity: false,
        specifications: {
            "Brand": "SoundWave",
            "Model": "MiniBlast X",
            "Connectivity": "Bluetooth 5.0, AUX",
            "Battery Life": "Up to 12 hours",
            "Condition": "Like New"
        },
        logistics: {
            locationType: 'profile_stored_location',
            selectedUserStoredLocationId: 'user2_apt',
            deliveryMethods: ['pickup_only'],
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
        openToAnyOpportunity: false,
        specifications: {
            "Product Type": "Live Plants",
            "Quantity": "5",
            "Pot Material": "Ceramic",
            "Care Level": "Easy"
        },
        logistics: {
            locationType: 'item_specific_location',
            itemSpecificAddress: "Charlie's Balcony Garden",
            deliveryMethods: ['public_meetup', 'flexible_meetup'],
            timing: { type: 'flexible' }
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
        openToAnyOpportunity: false,
        specifications: {
            "Material": "Recycled Denim",
            "Feature": "Eco-friendly, Durable"
        },
        logistics: {
            locationType: 'item_specific_location',
            itemSpecificAddress: "Charlie's Workshop",
            deliveryMethods: ['willing_to_ship'],
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
        openToAnyOpportunity: true,
        specifications: {
            "Title": "Dune",
            "Author": "Frank Herbert",
            "Edition": "First Edition",
            "Desired Condition": "Good or Very Good"
        },
        logistics: {
            locationType: 'not_specified',
            deliveryMethods: ['willing_to_ship', 'public_meetup'],
            timing: { type: 'flexible' }
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
        openToAnyOpportunity: false,
        specifications: {
            "Brand": "Fujifilm",
            "Model": "X100V",
            "Desired Condition": "Good working condition"
        },
        logistics: {
            locationType: 'profile_stored_location',
            selectedUserStoredLocationId: 'user2_apt',
            deliveryMethods: ['pickup_only', 'willing_to_ship'],
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
        openToAnyOpportunity: false,
        specifications: {
            "Decade": "1950s",
            "Material": "Wool Felt",
            "Size": "Medium",
            "Condition": "Excellent Vintage"
        },
        logistics: {
            locationType: 'item_specific_location',
            itemSpecificAddress: "Diana's Boutique",
            deliveryMethods: ['possible_delivery', 'willing_to_ship'],
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
        openToAnyOpportunity: false,
        specifications: {
            "Title": "The Uncanny X-Men",
            "Era": "Mid-1980s",
            "Desired Grade": "8.0 or higher"
        },
        logistics: {
            locationType: 'item_specific_location',
            itemSpecificAddress: 'Diana Doodad Wants This Shipped To: 12Collector Lane',
            deliveryMethods: ['willing_to_ship'],
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
        openToAnyOpportunity: true,
        specifications: {
            "Capacity": "4 Person",
            "Type": "Dome Tent",
            "Condition": "Used - Great (Used Twice)",
            "Includes": "Rainfly, Carrying Bag"
        },
        logistics: {
            locationType: 'item_specific_location',
            itemSpecificAddress: "Ethan's Garage",
            deliveryMethods: ['flexible_meetup', 'pickup_only'],
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
        openToAnyOpportunity: false,
        specifications: {
            "Weight Range": "5-50 lbs (Adjustable)",
            "Use": "Home Workouts"
        },
        logistics: {
            locationType: 'item_specific_location',
            itemSpecificAddress: "Ethan's Home Gym",
            deliveryMethods: ['public_meetup', 'pickup_only'],
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
        openToAnyOpportunity: false,
        specifications: {
            "Quantity": "Approx. 50 records",
            "Genre": "Classic Rock",
            "Era": "1970s-1980s",
            "Condition": "Mixed"
        },
        logistics: {
            locationType: 'profile_stored_location',
            selectedUserStoredLocationId: 'user1_work',
            deliveryMethods: ['willing_to_ship', 'pickup_only'],
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
        openToAnyOpportunity: false,
        specifications: {
            "Type": "Beginner Skateboard (Complete)",
            "User": "Adult",
            "Desired Condition": "Good"
        },
        logistics: {
            locationType: 'item_specific_location',
            itemSpecificAddress: "Charlie Swapper wants this delivered locally if possible.",
            deliveryMethods: ['delivery_area', 'public_meetup'],
            timing: { type: 'fixed_date', date: '2024-08-01' }
        }
    }
];
exports.dummyUsers.forEach(user => {
    user.items = exports.dummyItems.filter(item => item.ownerId === user.id);
});
exports.dummyItems.forEach(item => {
    const owner = exports.dummyUsers.find(user => user.id === item.ownerId);
    if (owner) {
        item.ownerName = owner.name;
    }
});
function updateUserPreferencesInDummyData(userId, newPreferences) {
    const userIndex = exports.dummyUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        console.warn(`[DummyData] User with ID ${userId} not found for preference update.`);
        return false;
    }
    const userToUpdate = exports.dummyUsers[userIndex];
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
    exports.dummyUsers[userIndex] = userToUpdate;
    return true;
}
function addNewItemToDummyData(itemData) {
    var _a, _b, _c, _d;
    const owner = exports.dummyUsers.find(user => user.id === itemData.ownerId);
    if (!owner) {
        console.error(`[DummyData] Owner with ID ${itemData.ownerId} not found. Cannot add item.`);
        throw new Error(`Owner not found for ID: ${itemData.ownerId}`);
    }
    let finalLogistics;
    if (itemData.logistics) {
        finalLogistics = {
            locationType: itemData.logistics.locationType,
            selectedUserStoredLocationId: itemData.logistics.locationType === 'profile_stored_location' ? itemData.logistics.selectedUserStoredLocationId : undefined,
            // @ts-expect-error TS2367 Pre-existing type mismatch or subtle inference issue
            itemSpecificAddress: itemData.logistics.locationType === 'item_specific_location' ? itemData.logistics.itemSpecificAddress : undefined,
            deliveryMethods: itemData.logistics.deliveryMethods,
            timing: itemData.logistics.timing,
            notes: itemData.logistics.notes,
        };
    }
    else {
        let defaultLocType = 'not_specified';
        let defaultStoredId = undefined;
        if (((_a = owner.logisticsPreferences) === null || _a === void 0 ? void 0 : _a.preferredStoredLocationId) && ((_b = owner.locations) === null || _b === void 0 ? void 0 : _b.find(l => { var _a; return l.id === ((_a = owner.logisticsPreferences) === null || _a === void 0 ? void 0 : _a.preferredStoredLocationId); }))) {
            defaultLocType = 'profile_stored_location';
            defaultStoredId = owner.logisticsPreferences.preferredStoredLocationId;
        }
        else if (owner.locations && owner.locations.length > 0 && ((_c = owner.locations[0]) === null || _c === void 0 ? void 0 : _c.id)) {
            defaultLocType = 'profile_stored_location';
            defaultStoredId = owner.locations[0].id;
        }
        finalLogistics = {
            locationType: defaultLocType,
            selectedUserStoredLocationId: defaultStoredId,
            itemSpecificAddress: defaultLocType === 'item_specific_location' ? 'Default Address Needed' : undefined,
            deliveryMethods: ((_d = owner.logisticsPreferences) === null || _d === void 0 ? void 0 : _d.defaultDeliveryMethods) || ['pickup_only'],
            timing: { type: 'flexible' },
            notes: '',
        };
    }
    const newItem = Object.assign(Object.assign({}, itemData), { id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, ownerName: owner.name, status: 'available', dataAiHint: itemData.name.toLowerCase().split(' ').slice(0, 2).join(' ') || 'new item', imageUrl: itemData.imageUrl || 'https://placehold.co/600x400.png', logistics: finalLogistics, specifications: itemData.specifications || {} });
    exports.dummyItems.push(newItem);
    const userIndex = exports.dummyUsers.findIndex(u => u.id === itemData.ownerId);
    if (userIndex !== -1) {
        exports.dummyUsers[userIndex].items.push(newItem);
    }
    console.log('[DummyData] Added new item:', newItem);
    console.log('[DummyData] Total items now:', exports.dummyItems.length);
    return newItem;
}
