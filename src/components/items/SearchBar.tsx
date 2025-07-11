'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

interface SearchBarProps {
  executeSearch: (query: string) => void; // Changed prop name and made it required for now
  onFilterToggle?: () => void;
}

export default function SearchBar({ executeSearch, onFilterToggle }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchTerm); // Call the new prop
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search for items..."
          className="pl-10 pr-4 py-2 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <Button type="submit" variant="default" className="bg-primary hover:bg-primary/90">
        Search
      </Button>
      {onFilterToggle && (
        <Button type="button" variant="outline" onClick={onFilterToggle}>
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      )}
    </form>
  );
}
