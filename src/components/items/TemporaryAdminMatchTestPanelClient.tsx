
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Loader2, AlertCircle, Link2 as LinkIcon } from 'lucide-react'; // Renamed Link2 to LinkIcon
import type { Item } from '@/types';
import type { AIMatchingMode } from '@/services/ai-config-service';
import { suggestMatchingItems, type ItemMatchInput, type ItemMatchOutput } from '@/ai/flows/item-match-flow';
import { dummyItems, dummyUsers } from '@/lib/dummy-data';
import ItemList from '@/components/items/ItemList'; // Assuming ItemList can be used here
import { Badge } from '@/components/ui/badge';


interface TemporaryAdminMatchTestPanelClientProps {
  itemToTest: Item | null;
}

export default function TemporaryAdminMatchTestPanelClient({ itemToTest }: TemporaryAdminMatchTestPanelClientProps) {
  const [testMatchingMode, setTestMatchingMode] = useState<AIMatchingMode>('simple'); // This is only for UI, flow decides actual
  const [testUseUserPrefs, setTestUseUserPrefs] = useState(false); // This is only for UI, flow decides actual
  const [testSuggestions, setTestSuggestions] = useState<(Item & { matchScore: string })[]>([]);
  const [testReasoning, setTestReasoning] = useState<string | null>(null);
  const [testPrefsConsidered, setTestPrefsConsidered] = useState<boolean>(false);
  const [testModeUsed, setTestModeUsed] = useState<AIMatchingMode | undefined>(undefined);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const currentViewingUser = dummyUsers[0]; // Simulate a viewing user for test context

  const handleRunTestSuggestions = async () => {
    if (!itemToTest) {
      setTestError("Item to test not available.");
      return;
    }
    setTestLoading(true);
    setTestError(null);
    setTestSuggestions([]);
    setTestReasoning(null);
    setTestModeUsed(undefined);
    setTestPrefsConsidered(false);

    const otherAvailableItems = dummyItems.filter(
      (item) => item.id !== itemToTest.id &&
                 (item.status === 'available' || item.status === 'pending')
    ).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        ownerId: item.ownerId,
        listingType: item.listingType,
    }));

    try {
      const inputForFlow: ItemMatchInput = {
        triggeringUserId: currentViewingUser.id,
        currentItem: {
          id: itemToTest.id,
          name: itemToTest.name,
          description: itemToTest.description,
          category: itemToTest.category,
          ownerId: itemToTest.ownerId,
          listingType: itemToTest.listingType,
        },
        availableItems: otherAvailableItems,
      };

      // The flow will use the admin-configured mode and preference settings.
      // The testMatchingMode and testUseUserPrefs here are just for UI display/intent.
      const result: ItemMatchOutput = await suggestMatchingItems(inputForFlow);

      setTestPrefsConsidered(result.preferencesConsidered);
      setTestModeUsed(result.usedMatchingMode);

      const augmentedMatchedItems = (result.suggestedMatches || []).map(match => {
        const itemDetails = dummyItems.find(dItem => dItem.id === match.itemId);
        return itemDetails ? { ...itemDetails, matchScore: match.matchScore } : null;
      }).filter(Boolean) as (Item & { matchScore: string })[];

      setTestSuggestions(augmentedMatchedItems);
      setTestReasoning(result.reasoning || "No specific reasoning provided by AI for this test run.");
      if (result.reasoning && (result.reasoning.toLowerCase().includes('error') || result.reasoning.toLowerCase().includes('could not process'))) {
        setTestError(result.reasoning);
      }

    } catch (err: any) {
      console.error("Error in TemporaryAdminMatchTestPanelClient during suggestMatchingItems:", err);
      setTestError(err.message || "An unknown error occurred during test suggestion.");
    } finally {
      setTestLoading(false);
    }
  };

  if (!itemToTest) return null;

  return (
    <Card className="mt-8 border-dashed border-primary/50">
      <Collapsible open={panelOpen} onOpenChange={setPanelOpen} className="w-full">
        <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full flex justify-between items-center text-left mb-0 py-3 px-4 hover:bg-primary/10">
                <span className="font-headline text-md flex items-center gap-2 text-primary">
                    <Settings className="h-5 w-5" />
                    Admin: Test AI Suggestions for &quot;{itemToTest.name}&quot;
                </span>
                <span className="text-xs">{panelOpen ? "Hide Panel" : "Show Panel"}</span>
            </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-4 space-y-4 border-t border-dashed border-primary/30">
            <CardDescription className="text-xs font-body mb-2">
              Test the AI matching logic for this item. The flow uses admin-configured settings for matching mode and preference usage.
              The toggles below are for documenting test intent, not direct control.
            </CardDescription>
            <div className="flex items-center space-x-2">
              <Switch
                id={`test-mode-switch-${itemToTest.id}`}
                checked={testMatchingMode === 'advanced'}
                onCheckedChange={(checked) => setTestMatchingMode(checked ? 'advanced' : 'simple')}
                aria-label="Toggle advanced matching mode for test intent"
              />
              <Label htmlFor={`test-mode-switch-${itemToTest.id}`} className="font-headline text-sm">Test Intent: Advanced Matching</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id={`test-prefs-switch-${itemToTest.id}`}
                checked={testUseUserPrefs}
                onCheckedChange={setTestUseUserPrefs}
                aria-label="Toggle user preference consideration for test intent"
              />
              <Label htmlFor={`test-prefs-switch-${itemToTest.id}`} className="font-headline text-sm">Test Intent: Consider User Preferences</Label>
            </div>
            <Button onClick={handleRunTestSuggestions} disabled={testLoading || !itemToTest} size="sm">
              {testLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
              Run Test AI Suggestions
            </Button>

            {testLoading && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Fetching test suggestions...</p>}
            {testError && (
              <div className="p-3 border border-destructive bg-destructive/10 rounded-md text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{testError}</p>
              </div>
            )}
            {!testLoading && (testSuggestions.length > 0 || testReasoning || testModeUsed) && (
              <div className="mt-4 space-y-3">
                <h4 className="font-headline text-md">Test Results:</h4>
                {testModeUsed && 
                  <div className="text-xs text-muted-foreground">
                    <span>Actual AI Matching Mode Used: </span>
                    <Badge variant={testModeUsed === 'advanced' ? "default" : "secondary"} className="capitalize">{testModeUsed}</Badge>
                  </div>
                }
                {testPrefsConsidered !== undefined && 
                  <div className="text-xs text-muted-foreground">
                    <span>Actual AI Preferences Considered: </span>
                    <Badge variant={testPrefsConsidered ? "default" : "secondary"}>{testPrefsConsidered ? 'Yes' : 'No'}</Badge>
                  </div>
                }
                {testReasoning && <p className="text-xs italic text-muted-foreground">AI Reasoning: {testReasoning}</p>}
                
                {testSuggestions.length > 0 ? (
                  <ItemList items={testSuggestions} mainContextItemId={itemToTest.id}/>
                ) : (
                  !testError && <p className="text-sm text-muted-foreground">No items suggested by this test run.</p>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
    </Collapsible>
    </Card>
  );
}
