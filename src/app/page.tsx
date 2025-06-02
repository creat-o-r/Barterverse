'use client';

import ItemList from '@/components/items/ItemList';
import SearchBar from '@/components/items/SearchBar';
import { dummyItems } from '@/lib/dummy-data'; // We'll use dummy data for now
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  // In a real app, you'd fetch items and handle search/filter state
  const items = dummyItems.filter(item => item.status === 'available' || item.status === 'pending');

  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <h1 className="text-4xl md:text-5xl font-headline text-primary mb-4">Welcome to BarterVerse</h1>
        <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
          Discover unique items and connect with fellow traders. Your next great find is just a barter away!
        </p>
      </section>

      <SearchBar 
        onSearch={(query) => console.log('Searching for:', query)} 
        onFilterToggle={() => console.log('Toggle filters')} 
      />
      
      {/* Placeholder for filter section. Could be a sidebar or a dropdown panel */}
      {/* 
      <div className="mb-6 p-4 bg-card rounded-lg shadow">
        <h3 className="text-lg font-headline mb-2">Filters</h3>
        <p className="text-sm text-muted-foreground font-body">Filter controls will go here (e.g., by category, location).</p>
      </div>
      */}

      <section>
        <h2 className="text-3xl font-headline text-foreground mb-6">Available Items</h2>
        <ItemList items={items} />
      </section>
    </div>
  );
}
