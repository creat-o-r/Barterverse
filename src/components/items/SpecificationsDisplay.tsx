
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

  const specKeys = Object.keys(specifications);
  const summaryText = specKeys.length > 0
    ? `(Summary: ${specKeys.slice(0, 2).join(', ')}${specKeys.length > 2 ? '...' : ''} - ${specKeys.length} detail${specKeys.length === 1 ? '' : 's'})`
    : '(No details provided)';

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="w-full space-y-2 mb-4 mt-2"
    >
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="flex w-full justify-between items-center px-4 py-3 rounded-md border bg-muted/20 hover:bg-muted/40"
        >
          <div className="flex items-center">
            <ListChecks className="h-5 w-5 mr-2 text-primary" />
            <span className="font-semibold text-md">Specifications</span>
            {!isOpen && <span className="text-xs text-muted-foreground ml-2 font-normal">{summaryText}</span>}
          </div>
          <ChevronDown
            className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 p-4 border rounded-md bg-muted/10">
          <ul className="space-y-1.5 font-body text-sm">
            {Object.entries(specifications).map(([key, value]) => (
              <li key={key} className="flex">
                <strong className="font-semibold w-1/3 min-w-[100px] pr-2 capitalize">{key}:</strong>
                <span className="flex-1">{value}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs italic text-muted-foreground mt-3 pt-2 border-t border-dashed">
            Note: Specifications are for informational purposes. AI may help populate this in the future.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
