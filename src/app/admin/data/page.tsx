"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, DatabaseZap, Trash2, AlertTriangle } from 'lucide-react';
import { seedDatabaseWithDummyData, clearAllDummyData } from '@/lib/firebase/seedUtils'; // Ensure this path is correct

export default function AdminDataManagementPage() {
  const [isLoadingSeed, setIsLoadingSeed] = useState(false);
  const [isLoadingClear, setIsLoadingClear] = useState(false);
  const [operationResult, setOperationResult] = useState<{ success: boolean; message: string; details?: string[] } | null>(null);

  const handleSeedData = async () => {
    setIsLoadingSeed(true);
    setOperationResult(null);
    const result = await seedDatabaseWithDummyData();
    setOperationResult(result);
    setIsLoadingSeed(false);
  };

  const handleClearData = async () => {
    setIsLoadingClear(true);
    setOperationResult(null);
    // Add a confirmation dialog for destructive actions
    if (!window.confirm("Are you sure you want to clear all dummy data (users and items) from Firestore? This action cannot be undone.")) {
      setIsLoadingClear(false);
      return;
    }
    const result = await clearAllDummyData();
    setOperationResult(result);
    setIsLoadingClear(false);
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseZap className="h-6 w-6 text-primary" />
            Firestore Dummy Data Management
          </CardTitle>
          <CardDescription>
            Use these tools to load or clear the dummy user and item data in your Firestore database.
            This is useful for testing or resetting the application to a known state.
            Ensure your Firebase environment variables are correctly set in <code className="bg-muted p-1 rounded-sm text-xs">.env.local</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3 p-4 border rounded-lg bg-background shadow">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <DatabaseZap className="h-5 w-5 text-green-600" />
              Load/Reload Dummy Data
            </h3>
            <p className="text-sm text-muted-foreground">
              This will first clear any existing users and items, then populate Firestore with the standard set of dummy data.
            </p>
            <Button onClick={handleSeedData} disabled={isLoadingSeed || isLoadingClear} className="w-full sm:w-auto">
              {isLoadingSeed ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DatabaseZap className="mr-2 h-4 w-4" />
              )}
              {isLoadingSeed ? 'Processing...' : 'Load Dummy Data to Firestore'}
            </Button>
          </div>

          <div className="space-y-3 p-4 border rounded-lg bg-background shadow">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Clear Dummy Data
            </h3>
            <p className="text-sm text-muted-foreground">
              This will remove all documents from the 'users' and 'items' collections in Firestore.
            </p>
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={isLoadingClear || isLoadingSeed}
              className="w-full sm:w-auto"
            >
              {isLoadingClear ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {isLoadingClear ? 'Processing...' : 'Clear All Dummy Data from Firestore'}
            </Button>
          </div>

          {operationResult && (
            <Card className={`mt-6 ${operationResult.success ? 'border-green-500' : 'border-red-500'}`}>
              <CardHeader className={`pb-2 ${operationResult.success ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                <CardTitle className={`text-lg flex items-center gap-2 ${operationResult.success ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {operationResult.success ? (
                     <DatabaseZap className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                  Operation Result
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-1">
                <p className={`font-medium ${operationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {operationResult.message}
                </p>
                {operationResult.details && operationResult.details.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground space-y-0.5 max-h-48 overflow-y-auto p-2 bg-muted rounded-md">
                    <p className="font-semibold mb-1">Details:</p>
                    {operationResult.details.map((detail, index) => (
                      <p key={index} className="whitespace-pre-wrap break-words">{detail}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
