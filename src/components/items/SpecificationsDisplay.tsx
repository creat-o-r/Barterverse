
'use client';

// Removed useState, Collapsible, CollapsibleTrigger, CollapsibleContent, Button, ListChecks, ChevronDown, cn

interface SpecificationsDisplayProps {
  specifications?: Record<string, string>;
}

export default function SpecificationsDisplay({ specifications }: SpecificationsDisplayProps) {
  if (!specifications || Object.keys(specifications).length === 0) {
    return null;
  }

  return (
    <div className="mb-4 mt-2 p-4 border rounded-md bg-muted/10">
      <h4 className="font-semibold text-md mb-2">Specifications:</h4>
      <ul className="space-y-1.5 font-body text-sm">
        {Object.entries(specifications).map(([key, value]) => (
          <li key={key} className="flex">
            <strong className="font-semibold w-1/3 min-w-[100px] pr-2">{key}:</strong>
            <span className="flex-1">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
