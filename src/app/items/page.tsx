'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Ensure db is correctly exported from your Firebase config
import type { Item as ItemType } from '@/types'; // Ensure this path is correct
import ItemCard from '@/components/items/ItemCard'; // Ensure this path is correct
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function BrowseItemsPage() {
  const [items, setItems] = useState<ItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // All categories by default
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest', 'titleAsc', 'titleDesc'

  // TODO: Get actual categories from data or a predefined list
  const categories = ['Electronics', 'Books', 'Furniture', 'Clothing', 'Other'];

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Base query: items that are available
        let itemsQuery = query(collection(db, 'items'), where('status', '==', 'available'));

        // Category filter
        if (selectedCategory && selectedCategory !== 'all') {
          itemsQuery = query(itemsQuery, where('category', '==', selectedCategory));
        }

        // Sorting
        // Note: Firestore requires an index for most compound queries (e.g., category + sort order).
        // If sorting by a field other than 'createdAt' and also filtering by category,
        // ensure composite indexes are created in Firestore.
        if (sortOrder === 'newest') {
          itemsQuery = query(itemsQuery, orderBy('createdAt', 'desc'));
        } else if (sortOrder === 'oldest') {
          itemsQuery = query(itemsQuery, orderBy('createdAt', 'asc'));
        } else if (sortOrder === 'titleAsc') {
          itemsQuery = query(itemsQuery, orderBy('title', 'asc'));
        } else if (sortOrder === 'titleDesc') {
          itemsQuery = query(itemsQuery, orderBy('title', 'desc'));
        }
        // Add more sorting options as needed

        const querySnapshot = await getDocs(itemsQuery);
        const fetchedItems = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt), // Convert Timestamp to Date
          } as ItemType;
        });

        setItems(fetchedItems);
      } catch (e: any) {
        console.error("Error fetching items:", e);
        setError(e.message || "Failed to fetch items.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [selectedCategory, sortOrder]); // Re-fetch when category or sortOrder changes

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto my-8">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Browse Items</h1>
        <p className="text-lg text-muted-foreground mt-2 font-body">
          Discover treasures offered by our community.
        </p>
      </header>

      {/* Filters and Search Bar */}
      <div className="mb-8 p-4 bg-card border rounded-lg shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <Input
          type="text"
          placeholder="Search by title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow sm:max-w-xs md:max-w-sm"
        />
        <div className="flex gap-4 w-full sm:w-auto">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="titleAsc">Title (A-Z)</SelectItem>
              <SelectItem value="titleDesc">Title (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-2xl font-semibold text-muted-foreground mb-2">No items found.</p>
          <p className="text-md text-muted-foreground">
            Try adjusting your search or filters, or check back later!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map(item => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
