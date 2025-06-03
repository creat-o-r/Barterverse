
'use client'; 

import { useEffect, useState } from 'react';
import { getLoggedMatchSuggestions, type LoggedMatchSuggestion } from '@/services/match-report-service';
import { 
  getAIMatchingMode, 
  setAIMatchingMode as setAIMatchingModeService, 
  type AIMatchingMode,
  getUseUserProfilePreferencesInMatching,
  setUseUserProfilePreferencesInMatching as setUseUserProfilePreferencesInMatchingService,
  getEnableAutomaticPreferenceInference,
  setEnableAutomaticPreferenceInference as setEnableAutomaticPreferenceInferenceService
} from '@/services/ai-config-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ServerCrash, Link as LinkIcon, TrendingUp, TrendingDown, Minus, User as UserIconLucide, BrainCircuit, Zap, RefreshCw, Settings2, UserCog, Brain, Wand2 } from 'lucide-react'; 
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import AdminAIPreferenceInsights from '@/components/admin/AdminAIPreferenceInsights'; 

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
  const [useUserPrefsInMatching, setUseUserPrefsInMatching] = useState(true);
  const [enableAutoPrefInference, setEnableAutoPrefInference] = useState(false);
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [isUpdatingPrefsMatchToggle, setIsUpdatingPrefsMatchToggle] = useState(false);
  const [isUpdatingAutoPrefToggle, setIsUpdatingAutoPrefToggle] = useState(false);
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
      const prefsEnabledMatch = await getUseUserProfilePreferencesInMatching();
      setUseUserPrefsInMatching(prefsEnabledMatch);
      const autoPrefEnabled = await getEnableAutomaticPreferenceInference();
      setEnableAutoPrefInference(autoPrefEnabled);
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
        toast({ title: "AI Mode Updated", description: `Matching mode set to ${newMode}.` });
      } else { throw new Error(result.message || "Failed to update mode server-side"); }
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update AI matching mode.", variant: "destructive" });
      fetchAdminSettings(); 
    } finally { setIsUpdatingMode(false); }
  };

  const handlePrefsMatchToggle = async (newPrefsChecked: boolean) => {
    if (newPrefsChecked === useUserPrefsInMatching) return;
    setIsUpdatingPrefsMatchToggle(true);
    try {
      const result = await setUseUserProfilePreferencesInMatchingService(newPrefsChecked);
      if (result.success) {
        setUseUserPrefsInMatching(newPrefsChecked);
        toast({ title: "AI Preference Usage Updated", description: `AI will ${newPrefsChecked ? 'now consider' : 'no longer consider'} user profile preferences in matching.` });
      } else { throw new Error(result.message || "Failed to update preference usage setting."); }
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update preference usage setting for matching.", variant: "destructive" });
      fetchAdminSettings();
    } finally { setIsUpdatingPrefsMatchToggle(false); }
  };

  const handleAutoPrefToggle = async (newAutoPrefChecked: boolean) => {
    if (newAutoPrefChecked === enableAutoPrefInference) return;
    setIsUpdatingAutoPrefToggle(true);
    try {
      const result = await setEnableAutomaticPreferenceInferenceService(newAutoPrefChecked);
      if (result.success) {
        setEnableAutoPrefInference(newAutoPrefChecked);
        toast({ title: "Automatic Preference Inference Updated", description: `Automatic AI preference inference is now ${newAutoPrefChecked ? 'ENABLED' : 'DISABLED'}.` });
      } else { throw new Error(result.message || "Failed to update auto preference inference setting."); }
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update auto preference inference setting.", variant: "destructive" });
      fetchAdminSettings();
    } finally { setIsUpdatingAutoPrefToggle(false); }
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
            Control AI behavior for item matching and preference learning. Changes apply globally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
                <Switch id="ai-matching-mode" checked={currentMatchingMode === 'advanced'} onCheckedChange={handleModeToggle} disabled={isUpdatingMode} />
                <Label htmlFor="ai-matching-mode" className="flex-grow font-headline text-lg">Use Advanced AI Matching</Label>
                {isUpdatingMode && <RefreshCw className="h-5 w-5 animate-spin text-primary" />}
            </div>
            <div className="text-sm text-muted-foreground p-4 border-l-4 border-primary/50 bg-primary/5 rounded-md space-y-1">
                <div className="flex items-start gap-2"><BrainCircuit className="h-5 w-5 text-primary mt-0.5 shrink-0" /><div><strong className="text-foreground">Advanced Mode:</strong> Considers 'offer' vs. 'want' types, aims for direct fulfillment and complementary trades. More nuanced.</div></div>
                 <div className="flex items-start gap-2"><Zap className="h-5 w-5 text-secondary-foreground mt-0.5 shrink-0" /><div><strong className="text-foreground">Simple Mode:</strong> Focuses on general relevance and keyword matches. Less nuanced.</div></div>
            </div>
            <Separator />
            <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
                <Switch id="ai-use-user-prefs-match" checked={useUserPrefsInMatching} onCheckedChange={handlePrefsMatchToggle} disabled={isUpdatingPrefsMatchToggle} />
                <Label htmlFor="ai-use-user-prefs-match" className="flex-grow font-headline text-lg">Consider User Profile Preferences in Matching</Label>
                {isUpdatingPrefsMatchToggle && <RefreshCw className="h-5 w-5 animate-spin text-primary" />}
            </div>
             <div className="text-sm text-muted-foreground p-4 border-l-4 border-primary/50 bg-primary/5 rounded-md space-y-1">
                <div className="flex items-start gap-2"><UserCog className="h-5 w-5 text-primary mt-0.5 shrink-0" /><div><strong className="text-foreground">Preferences Enabled (for Matching):</strong> AI matching (Advanced Mode) will consider the viewing user's motivations, location, etc., to tailor suggestions.</div></div>
            </div>
            <Separator />
             <div className="flex items-center space-x-3 p-4 border rounded-lg bg-muted/30">
                <Switch id="ai-auto-pref-inference" checked={enableAutoPrefInference} onCheckedChange={handleAutoPrefToggle} disabled={isUpdatingAutoPrefToggle} />
                <Label htmlFor="ai-auto-pref-inference" className="flex-grow font-headline text-lg">Enable Automatic AI Preference Inference</Label>
                {isUpdatingAutoPrefToggle && <RefreshCw className="h-5 w-5 animate-spin text-primary" />}
            </div>
             <div className="text-sm text-muted-foreground p-4 border-l-4 border-accent/50 bg-accent/5 rounded-md space-y-1">
                <div className="flex items-start gap-2"><Wand2 className="h-5 w-5 text-accent mt-0.5 shrink-0" /><div><strong className="text-foreground">Auto-Inference Enabled:</strong> If enabled, users will see an option on their profile to let AI learn and (mock) update their preferences based on activity. This is experimental.</div></div>
            </div>
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground font-body space-x-2">
                <span>Matching: <Badge variant={currentMatchingMode === 'advanced' ? 'default' : 'secondary'} className="capitalize">{currentMatchingMode}</Badge>.</span>
                <span>Prefs in Match: <Badge variant={useUserPrefsInMatching ? 'default' : 'secondary'}>{useUserPrefsInMatching ? 'On' : 'Off'}</Badge>.</span>
                <span>Auto Prefs: <Badge variant={enableAutoPrefInference ? 'default' : 'secondary'}>{enableAutoPrefInference ? 'On' : 'Off'}</Badge>.</span>
            </div>
        </CardFooter>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle className="font-headline text-3xl flex items-center gap-3"><ServerCrash className="h-8 w-8 text-accent" />AI Match Suggestion Logs</CardTitle>
                <CardDescription className="font-body mt-1">This report shows AI-generated item match suggestions. <br /><span className="font-semibold text-destructive-foreground bg-destructive/80 px-2 py-1 rounded-sm inline-block my-1 text-xs">Dev Note:</span> React Strict Mode may cause duplicate log entries in development.</CardDescription>
            </div>
            <Button onClick={fetchReports} disabled={isLoadingReports} variant="outline" size="sm"><RefreshCw className={`mr-2 h-4 w-4 ${isLoadingReports ? 'animate-spin' : ''}`} />Refresh Logs</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 max-h-[70vh] flex flex-col">
          {isLoadingReports ? (
             <div className="p-6 text-center py-12 text-muted-foreground font-body flex items-center justify-center gap-2"><RefreshCw className="h-5 w-5 animate-spin" /> Loading suggestion logs...</div>
          ) : reports.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground font-body py-12">No match suggestions have been logged yet.</div>
          ) : (
            <div className="flex-1 min-h-0"> {/* This div takes available height and allows Table to scroll */}
              <Table className="min-w-full h-full"> {/* Table takes full height of its parent and handles its own scroll */}
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="min-w-[120px]">For User ID</TableHead>
                    <TableHead className="min-w-[200px]">Current Item</TableHead>
                    <TableHead className="min-w-[120px]">Matching Mode</TableHead>
                    <TableHead className="min-w-[100px]">Prefs Used</TableHead>
                    <TableHead className="min-w-[400px]">Suggested Items (ID, (Owner ID), Score)</TableHead>
                    <TableHead className="min-w-[300px]">Reasoning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report, index) => (
                    <TableRow key={`${report.timestamp}-${report.currentItemId}-${report.triggeringUserId}-${index}-${(report.suggestedMatches || []).map(m => m.itemId).join('-')}`} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                      <TableCell className="font-mono text-xs">{new Date(report.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{report.triggeringUserId}</TableCell>
                      <TableCell>
                          <div className="font-semibold">{report.currentItemName}</div>
                          <div className="text-xs text-muted-foreground"><Link href={`/items/${report.currentItemId}`} className="hover:text-primary hover:underline inline-flex items-center gap-1">View Item <LinkIcon className="h-3 w-3" /></Link></div>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{report.usedMatchingMode ? (<Badge variant={report.usedMatchingMode === 'advanced' ? 'default' : 'secondary'}>{report.usedMatchingMode}</Badge>): (<Badge variant="outline">N/A</Badge>)}</TableCell>
                      <TableCell>{report.preferencesConsidered !== undefined ? (<Badge variant={report.preferencesConsidered ? 'default' : 'outline'} className="text-[10px] py-0.5 px-1.5">{report.preferencesConsidered ? 'Yes' : 'No'}</Badge>) : (<Badge variant="outline" className="text-[10px] py-0.5 px-1.5">N/A</Badge>)}</TableCell>
                      <TableCell>
                        {report.suggestedMatches && report.suggestedMatches.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {report.suggestedMatches.map(match => (
                              <div key={match.itemId} className="flex items-center gap-2 text-xs">
                                <Badge className={`py-0.5 px-2 flex items-center ${getMatchScoreColor(match.matchScore)}`}>{getMatchScoreIcon(match.matchScore)}{match.matchScore || 'N/A'}</Badge>
                                <Link href={`/items/${match.itemId}`} className="hover:text-primary hover:underline inline-flex items-center gap-1">{match.itemId} <LinkIcon className="h-3 w-3" /></Link>
                                <Link href={`/profile/${match.ownerId}`} className="text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-0.5">({match.ownerId} <UserIconLucide className="h-3 w-3" />)</Link>
                              </div>))}
                          </div>
                        ) : (<span className="text-xs text-muted-foreground">None</span>)}
                      </TableCell>
                      <TableCell className="text-xs font-body text-muted-foreground break-words whitespace-pre-wrap">{report.reasoning || <span className="italic">N/A</span>}</TableCell>
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

