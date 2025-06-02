import type { Item, User } from '@/types';

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
  },
];

export const dummyItems: Item[] = [
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
  },
  {
    id: 'item3',
    name: 'Hand-knitted Scarf',
    description: 'A cozy and stylish scarf, hand-knitted with high-quality merino wool. Vibrant colors, brand new.',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'knitted scarf',
    category: 'Fashion & Accessories',
    ownerId: 'user1',
    ownerName: 'Alice Trader',
    status: 'available',
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
  },
];

// Assign items to users for profile pages
dummyUsers[0].items = [dummyItems[0], dummyItems[2]];
dummyUsers[1].items = [dummyItems[1], dummyItems[3]];
dummyUsers[2].items = [dummyItems[4], dummyItems[5]];
