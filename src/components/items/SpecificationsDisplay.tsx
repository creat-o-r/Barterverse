
'use client';

import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ListChecks, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpecificationsDisplayProps {
  specifications?: Record<string, string>;
}

export default function SpecificationsDisplay({ specifications }: SpecificationsDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!specifications || Object.keys(specifications).length === 0) {
    return null;
  }

  const specCount = Object.keys(specifications).length;
  const summaryKeys = Object.keys(specifications).slice(0, 3).join(', ');

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full justify-between text-sm hover:bg-muted/50">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            <span>
              Specifications {isOpen ? `(${specCount} details)` : `(Summary: ${summaryKeys}${specCount > 3 ? '...' : ''})`}
            </span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 p-4 border rounded-md bg-muted/10">
        <ul className="space-y-1.5 font-body text-sm">
          {Object.entries(specifications).map(([key, value]) => (
            <li key={key} className="flex">
              <strong className="font-semibold w-1/3 min-w-[100px] pr-2">{key}:</strong>
              <span className="flex-1">{value}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-3 italic">
            Note: Specifications are for informational purposes. AI may help populate this in the future.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
