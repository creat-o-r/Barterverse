
'use client'; 

import { useEffect, useState } from 'react';
import { getLoggedMatchSuggestions, type LoggedMatchSuggestion } from '@/services/match-report-service';
import { 
  getAIMatchingMode, 
  setAIMatchingMode as setAIMatchingModeService, 
  type AIMatchingMode,
  getUseUserProfilePreferencesInMatching,
  setUseUserProfilePreferencesInMatching as setUseUserProfilePreferencesInMatchingService
} from '@/services/ai-config-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ServerCrash, Link as LinkIcon, TrendingUp, TrendingDown, Minus, User as UserIconLucide, BrainCircuit, Zap, RefreshCw, Settings2, UserCog, Brain } from 'lucide-react'; // Added Brain
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import AdminAIPreferenceInsights from '@/components/admin/AdminAIPreferenceInsights'; // New import

function getMatchScoreColor(score?: string) {
  switch (score?.toLowerCase()) {
    case 'high': return 'bg-green-600 hover:bg-green-700 text-white';
    case 'medium': return 'bg-yellow-500 hover:bg-yellow-600 text-black';
    case 'low': return 'bg-red-500 hover:bg-red-600 text-white';
    default: return 'bg-gray-400 hover:bg-gray-500 text-white';
  }
}

function getMatchScoreIcon(score?: string) {
  switch (score?.toLowerCase()) {
    case 'high': return <TrendingUp className="h-3 w-3 mr-1" />;
    case 'medium': return <Minus className="h-3 w-3 mr-1" />; 
    case 'low': return <TrendingDown className="h-3 w-3 mr-1" />;
    default: return null;
  }
}

export default function MatchReportsPage() {
  const [reports, setReports] = useState<LoggedMatchSuggestion[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [currentMatchingMode, setCurrentMatchingMode] = useState<AIMatchingMode>('advanced');
  const [useUserPrefs, setUseUserPrefs] = useState(true);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [isUpdatingPrefsToggle, setIsUpdatingPrefsToggle] = useState(false);
  const { toast } = useToast();

  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      const fetchedReports = await getLoggedMatchSuggestions();
      setReports(fetchedReports);
    } catch (error) {
      console.error("Failed to fetch match reports:", error);
      toast({ title: "Error", description: "Could not load match reports.", variant: "destructive" });
    } finally {
      setIsLoadingReports(false);
    }
  };

  const fetchAdminSettings = async () => {
    try {
      const mode = await getAIMatchingMode();
      setCurrentMatchingMode(mode);
      const prefsEnabled = await getUseUserProfilePreferencesInMatching();
      setUseUserPrefs(prefsEnabled);
    } catch (error) {
      console.error("Failed to fetch AI settings:", error);
      toast({ title: "Error", description: "Could not load AI settings.", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchReports();
    fetchAdminSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeToggle = async (newModeChecked: boolean) => {
    const newMode: AIMatchingMode = newModeChecked ? 'advanced' : 'simple';
    if (newMode === currentMatchingMode) return;

    setIsUpdatingMode(true);
    try {
      const result = await setAIMatchingModeService(newMode);
      if (result.success) {
        setCurrentMatchingMode(newMode);
        toast({
          title: "AI Mode Updated",
          description: `Matching mode set to ${newMode}. New suggestions will use this mode.`,
        });
      } else {
        throw new Error(result.message || "Failed to update mode server-side");
      }
    } catch (error: any) {
      console.error("Failed to set AI matching mode:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update AI matching mode.",
        variant: "destructive",
      });
      fetchAdminSettings(); 
    } finally {
      setIsUpdatingMode(false);
    }
  };

  const handlePrefsToggle = async (newPrefsChecked: boolean) => {
    if (newPrefsChecked === useUserPrefs) return;

    setIsUpdatingPrefsToggle(true);
    try {
      const result = await setUseUserProfilePreferencesInMatchingService(newPrefsChecked);
      if (result.success) {
        setUseUserPrefs(newPrefsChecked);
        toast({
          title: "AI Preference Usage Updated",
          description: `AI will ${newPrefsChecked ? 'now consider' : 'no longer consider'} user profile preferences in matching.`,
        });
      } else {
        throw new Error(result.message || "Failed to update preference usage setting.");
      }
    } catch (error: any) {
      console.error("Failed to set preference usage setting:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Could not update preference usage setting.",
        variant: "destructive",
      });
      fetchAdminSettings();
    } finally {
      setIsUpdatingPrefsToggle(false);
    }
  };


  return (
    <div className="max-w-6xl mx-auto space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-primary" />
            AI Configuration
          </CardTitle>
          <CardDescription className="font-body">
            Control AI behavior for item matching. Changes will apply to new suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
                <Switch
                id="ai-matching-mode"
                checked={currentMatchingMode === 'advanced'}
                onCheckedChange={handleModeToggle}
                disabled={isUpdatingMode}
                />
                <Label htmlFor="ai-matching-mode" className="flex-grow font-headline text-lg">
                  Use Advanced AI Matching
                </Label>
                {isUpdatingMode && <RefreshCw className="h-5 w-5 animate-spin text-primary" />}
            </div>
            <div className="text-sm text-muted-foreground p-4 border-l-4 border-primary/50 bg-primary/5 rounded-md space-y-1">
                <div className="flex items-start gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                      <strong className="text-foreground">Advanced Mode:</strong> Considers 'offer' vs. 'want' types, aims for direct fulfillment and complementary trades. More nuanced.
                  </div>
                </div>
                 <div className="flex items-start gap-2">
                  <Zap className="h-5 w-5 text-secondary-foreground mt-0.5 shrink-0" />
                  <div>
                      <strong className="text-foreground">Simple Mode:</strong> Focuses on general relevance, category similarity, and keyword matches. Less nuanced.
                  </div>
                </div>
            </div>

            <Separator />

            <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
                <Switch
                id="ai-use-user-prefs"
                checked={useUserPrefs}
                onCheckedChange={handlePrefsToggle}
                disabled={isUpdatingPrefsToggle}
                />
                <Label htmlFor="ai-use-user-prefs" className="flex-grow font-headline text-lg">
                  Consider User Profile Preferences in Matching
                </Label>
                {isUpdatingPrefsToggle && <RefreshCw className="h-5 w-5 animate-spin text-primary" />}
            </div>
             <div className="text-sm text-muted-foreground p-4 border-l-4 border-primary/50 bg-primary/5 rounded-md space-y-1">
                <div className="flex items-start gap-2">
                  <UserCog className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                      <strong className="text-foreground">Preferences Enabled:</strong> AI matching will consider the viewing user's motivations, location preferences, trade timing, and 3rd party fulfillment interest to tailor suggestions.
                  </div>
                </div>
                 <div className="text-xs">
                    (Note: This primarily impacts 'Advanced' matching mode.)
                </div>
            </div>
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground font-body">
                Current active mode: <Badge variant={currentMatchingMode === 'advanced' ? 'default' : 'secondary'} className="capitalize">{currentMatchingMode}</Badge>.
                User preferences in matching: <Badge variant={useUserPrefs ? 'default' : 'secondary'}>{useUserPrefs ? 'Enabled' : 'Disabled'}</Badge>.
            </div>
        </CardFooter>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle className="font-headline text-3xl flex items-center gap-3">
                    <ServerCrash className="h-8 w-8 text-accent" />
                    AI Match Suggestion Logs
                </CardTitle>
                <CardDescription className="font-body mt-1">
                    This report shows AI-generated item match suggestions.
                    <br />
                    <span className="font-semibold text-destructive-foreground bg-destructive/80 px-2 py-1 rounded-sm inline-block my-1 text-xs">Important Dev Note:</span> Due to React Strict Mode, you may see duplicate entries in development for each suggestion event; this does not occur in production.
                </CardDescription>
            </div>
            <Button onClick={fetchReports} disabled={isLoadingReports} variant="outline" size="sm">
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
              Refresh Logs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingReports ? (
             <div className="text-center py-12 text-muted-foreground font-body flex items-center justify-center gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" /> Loading suggestion logs...
             </div>
          ) : reports.length === 0 ? (
            <p className="text-center text-muted-foreground font-body py-12">No match suggestions have been logged yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>For User ID</TableHead>
                    <TableHead>Current Item</TableHead>
                    <TableHead>Matching Mode</TableHead>
                     <TableHead>Prefs Used</TableHead>
                    <TableHead>Suggested Items (ID, (Owner ID), Score)</TableHead>
                    <TableHead className="min-w-[300px]">Reasoning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report, index) => (
                    <TableRow key={`${report.timestamp}-${report.currentItemId}-${report.triggeringUserId}-${index}-${(report.suggestedMatches || []).map(m => m.itemId).join('-')}`} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                      <TableCell className="font-mono text-xs">
                        {new Date(report.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{report.triggeringUserId}</TableCell>
                      <TableCell>
                          <div className="font-semibold">{report.currentItemName}</div>
                          <div className="text-xs text-muted-foreground">
                            <Link href={`/items/${report.currentItemId}`} className="hover:text-primary hover:underline inline-flex items-center gap-1">
                                View Item <LinkIcon className="h-3 w-3" />
                            </Link>
                          </div>
                      </TableCell>
                      <TableCell className="text-xs capitalize">
                        {report.usedMatchingMode ? (
                            <Badge variant={report.usedMatchingMode === 'advanced' ? 'default' : 'secondary'}>
                                {report.usedMatchingMode}
                            </Badge>
                        ): (
                            <Badge variant="outline">N/A</Badge>
                        )}
                      </TableCell>
                       <TableCell>
                        {(report as any).preferencesConsidered !== undefined ? (
                          <Badge variant={(report as any).preferencesConsidered ? 'default' : 'outline'} className="text-[10px] py-0.5 px-1.5">
                            {(report as any).preferencesConsidered ? 'Yes' : 'No'}
                          </Badge>
                        ) : (
                           <Badge variant="outline" className="text-[10px] py-0.5 px-1.5">N/A</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.suggestedMatches && report.suggestedMatches.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {report.suggestedMatches.map(match => (
                              <div key={match.itemId} className="flex items-center gap-2 text-xs">
                                <Badge
                                  className={`py-0.5 px-2 flex items-center ${getMatchScoreColor(match.matchScore)}`}
                                >
                                  {getMatchScoreIcon(match.matchScore)}
                                  {match.matchScore || 'N/A'}
                                </Badge>
                                <Link href={`/items/${match.itemId}`} className="hover:text-primary hover:underline inline-flex items-center gap-1">
                                  {match.itemId} <LinkIcon className="h-3 w-3" />
                                </Link>
                                <Link href={`/profile/${match.ownerId}`} className="text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-0.5">
                                  ({match.ownerId} <UserIconLucide className="h-3 w-3" />)
                                </Link>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-body text-muted-foreground break-words whitespace-pre-wrap">
                          {report.reasoning || <span className="italic">N/A</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />
      <AdminAIPreferenceInsights />

    </div>
  );
}
