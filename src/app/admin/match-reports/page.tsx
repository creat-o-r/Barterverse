
'use client';

import { useEffect, useState } from 'react';
import { getLoggedMatchSuggestions, getMatchSuggestionLogRawContent, type LoggedMatchSuggestion } from '@/services/match-report-service';
import {
  getAIMatchingMode,
  setAIMatchingMode as setAIMatchingModeService,
  type AIMatchingMode,
  getUseUserProfilePreferencesInMatching,
  setUseUserProfilePreferencesInMatching as setUseUserProfilePreferencesInMatchingService,
  getEnableAutomaticPreferenceInference,
  setEnableAutomaticPreferenceInference as setEnableAutomaticPreferenceInferenceService,
  getPreferredAIModel,
  setPreferredAIModel as setPreferredAIModelService,
  type AIModelName
} from '@/services/ai-config-service';
import { getFeedbackLogContent, clearFeedbackLog as clearFeedbackLogService } from '@/services/feedback-service';
import { getAIDiagnosticLogContent } from '@/services/ai-diagnostic-log-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ServerCrash, Link as LinkIcon, TrendingUp, TrendingDown, Minus, User as UserIconLucide, BrainCircuit, Zap, RefreshCw, Settings2, UserCog, Brain, Wand2, ClipboardCopy, AlertTriangle, Bug, Trash2, SlidersHorizontal, Cpu } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';
import AdminAIPreferenceInsights from '@/components/admin/AdminAIPreferenceInsights';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const modelDisplayMap: Record<AIModelName, string> = {
  'gemini-1.5-pro-latest': 'Gemini 1.5 Pro (Latest)',
  'gemini-1.0-pro': 'Gemini 1.0 Pro',
  'gemini-2.5-pro-preview': 'Gemini 2.5 Pro Preview',
};

export default function MatchReportsPage() {
  const [reports, setReports] = useState<LoggedMatchSuggestion[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [currentMatchingMode, setCurrentMatchingMode] = useState<AIMatchingMode>('advanced');
  const [useUserPrefsInMatching, setUseUserPrefsInMatching] = useState(true);
  const [enableAutoPrefInference, setEnableAutoPrefInference] = useState(false);
  const [preferredModel, setPreferredModel] = useState<AIModelName>('gemini-1.5-pro-latest'); // Default to the new forced model
  const [isUpdatingMode, setIsUpdatingMode] = useState(false);
  const [isUpdatingPrefsMatchToggle, setIsUpdatingPrefsMatchToggle] = useState(false);
  const [isUpdatingAutoPrefToggle, setIsUpdatingAutoPrefToggle] = useState(false);
  const [isUpdatingPreferredModel, setIsUpdatingPreferredModel] = useState(false);
  const [isCopyingFeedbackLog, setIsCopyingFeedbackLog] = useState(false);
  const [isCopyingMatchLog, setIsCopyingMatchLog] = useState(false);
  const [isCopyingDiagnosticLog, setIsCopyingDiagnosticLog] = useState(false);
  const [isClearingFeedbackLog, setIsClearingFeedbackLog] = useState(false);
  const [showClearFeedbackDialog, setShowClearFeedbackDialog] = useState(false);
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
      const model = await getPreferredAIModel(); // This will be forced to 'gemini-1.5-pro-latest' by the service
      setPreferredModel(model);
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

  const handlePreferredModelChange = async (newModelValue: string) => {
    const newModel = newModelValue as AIModelName;
    setIsUpdatingPreferredModel(true);
    try {
      const result = await setPreferredAIModelService(newModel); // Service will handle forcing logic
      if (result.success) {
        setPreferredModel('gemini-1.5-pro-latest'); // Reflect the forced model in UI
        toast({ title: "Preferred AI Model Updated", description: result.message || `Preferred model set to ${modelDisplayMap['gemini-1.5-pro-latest']}. A restart may be needed for changes to take full effect.` });
      } else { throw new Error(result.message || "Failed to update preferred model server-side."); }
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update preferred AI model.", variant: "destructive" });
      fetchAdminSettings();
    } finally {
      setIsUpdatingPreferredModel(false);
    }
  };


  const copyToClipboard = async (fetchContent: () => Promise<{ success: boolean; content?: string; error?: string }>, setIsCopyingState: (isCopying: boolean) => void, logName: string) => {
    setIsCopyingState(true);
    try {
      const result = await fetchContent();
      if (result.success && result.content !== undefined) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(result.content);
          toast({ title: "Success", description: `${logName} copied to clipboard!` });
        } else {
          toast({ title: "Clipboard Error", description: "Clipboard API not available. Could not copy.", variant: "destructive" });
        }
      } else {
        throw new Error(result.error || `Failed to fetch ${logName} content.`);
      }
    } catch (error: any) {
      toast({ title: "Copy Failed", description: error.message || `Could not copy ${logName}.`, variant: "destructive" });
    } finally {
      setIsCopyingState(false);
    }
  };

  const handleCopyFeedbackLog = () => copyToClipboard(getFeedbackLogContent, setIsCopyingFeedbackLog, "Feedback User Report Log");
  const handleCopyMatchLog = () => copyToClipboard(getMatchSuggestionLogRawContent, setIsCopyingMatchLog, "Raw Match Suggestion Log");
  const handleCopyDiagnosticLog = () => copyToClipboard(getAIDiagnosticLogContent, setIsCopyingDiagnosticLog, "AI Diagnostic Log");

  const performClearFeedbackLog = async () => {
    setIsClearingFeedbackLog(true);
    try {
      const result = await clearFeedbackLogService();
      if (result.success) {
        toast({ title: "Feedback Log Cleared", description: result.message });
      } else {
        toast({ title: "Clear Failed", description: result.message || "Could not clear feedback log.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Clear Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsClearingFeedbackLog(false);
      setShowClearFeedbackDialog(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-primary" />
            AI Configuration
          </CardTitle>
          <CardDescription className="font-body">
            Control AI behavior for item matching, preference learning, and model selection. Changes apply globally.
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
            <Separator />
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                    <Label htmlFor="ai-preferred-model" className="font-headline text-lg flex items-center gap-2">
                        <SlidersHorizontal className="h-5 w-5 text-primary" />
                        Preferred AI Model (Default for Flows)
                    </Label>
                    {isUpdatingPreferredModel && <RefreshCw className="h-5 w-5 animate-spin text-primary" />}
                </div>
                <Select
                    value={preferredModel}
                    onValueChange={handlePreferredModelChange}
                    disabled={isUpdatingPreferredModel}
                >
                    <SelectTrigger id="ai-preferred-model" className="w-full md:w-[300px]">
                        <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(modelDisplayMap) as AIModelName[]).filter(modelKey => modelKey === 'gemini-1.5-pro-latest').map(modelKey => ( // Only show the forced model
                            <SelectItem key={modelKey} value={modelKey}>
                                {modelDisplayMap[modelKey] || modelKey}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground p-4 border-l-4 border-primary/50 bg-primary/5 rounded-md space-y-1">
                    <div className="flex items-start gap-2">
                        <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                            <strong className="text-foreground">Model Selection:</strong> Chooses the default model for Genkit flows.
                            <br />
                            <span className="text-xs italic">Note: This configuration forces the model to '{modelDisplayMap['gemini-1.5-pro-latest']}'. Changes to the default model typically require an application restart to fully take effect across all backend flows.</span>
                        </div>
                    </div>
                </div>
            </div>
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground font-body space-x-2">
                <span>Matching: <Badge variant={currentMatchingMode === 'advanced' ? 'default' : 'secondary'} className="capitalize">{currentMatchingMode}</Badge>.</span>
                <span>Prefs in Match: <Badge variant={useUserPrefsInMatching ? 'default' : 'secondary'}>{useUserPrefsInMatching ? 'On' : 'Off'}</Badge>.</span>
                <span>Auto Prefs: <Badge variant={enableAutoPrefInference ? 'default' : 'secondary'}>{enableAutoPrefInference ? 'On' : 'Off'}</Badge>.</span>
                <span>Model: <Badge variant="outline" className="capitalize">{modelDisplayMap[preferredModel] || preferredModel}</Badge>.</span>
            </div>
        </CardFooter>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle className="font-headline text-3xl flex items-center gap-3"><ServerCrash className="h-8 w-8 text-accent" />AI Match Suggestion Logs</CardTitle>
                <CardDescription className="font-body mt-1">
                  This report shows AI-generated item match suggestions. Use this log to observe how suggestions and their scores change when AI configurations (like the preferred model) are updated.
                  The system is currently configured to use '{modelDisplayMap[preferredModel]}'.
                  Refresh this log after triggering new suggestions on the main site to see entries with the currently active model.
                  <br /><span className="font-semibold text-destructive-foreground bg-destructive/80 px-2 py-1 rounded-sm inline-block my-1 text-xs">Dev Note:</span> React Strict Mode may cause duplicate log entries in development.
                </CardDescription>
            </div>
            <Button onClick={fetchReports} disabled={isLoadingReports} variant="outline" size="sm"><RefreshCw className={`mr-2 h-4 w-4 ${isLoadingReports ? 'animate-spin' : ''}`} />Refresh Logs</Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col max-h-[70vh] p-0">
          {isLoadingReports ? (
             <div className="p-6 text-center py-12 text-muted-foreground font-body flex items-center justify-center gap-2"><RefreshCw className="h-5 w-5 animate-spin" /> Loading suggestion logs...</div>
          ) : reports.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground font-body py-12">No match suggestions have been logged yet.</div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto p-6 pt-0">
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[160px]">Timestamp</TableHead>
                    <TableHead className="min-w-[100px]">For User</TableHead>
                    <TableHead className="min-w-[180px]">Current Item</TableHead>
                    <TableHead className="min-w-[100px]">Matching</TableHead>
                    <TableHead className="min-w-[80px]">Prefs</TableHead>
                    <TableHead className="min-w-[120px]">Model Used</TableHead>
                    <TableHead className="min-w-[350px]">Suggested (ID, (Owner), Score)</TableHead>
                    <TableHead className="min-w-[250px]">Reasoning</TableHead>
                  </TableRow>
                </TableHeader><TableBody>
                  {reports.map((report, index) => (
                    <TableRow key={`${report.timestamp}-${report.currentItemId}-${report.triggeringUserId}-${index}-${(report.suggestedMatches || []).map(m => m.itemId).join('-')}`} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                      <TableCell className="font-mono text-xs">{new Date(report.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{report.triggeringUserId}</TableCell>
                      <TableCell>
                          <div className="font-semibold text-sm">{report.currentItemName}</div>
                          <div className="text-xs text-muted-foreground"><Link href={`/items/${report.currentItemId}`} className="hover:text-primary hover:underline inline-flex items-center gap-1">View Item <LinkIcon className="h-3 w-3" /></Link></div>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{report.usedMatchingMode ? (<Badge variant={report.usedMatchingMode === 'advanced' ? 'default' : 'secondary'}>{report.usedMatchingMode}</Badge>): (<Badge variant="outline">N/A</Badge>)}</TableCell>
                      <TableCell>{report.preferencesConsidered !== undefined ? (<Badge variant={report.preferencesConsidered ? 'default' : 'outline'} className="text-[10px] py-0.5 px-1.5">{report.preferencesConsidered ? 'Yes' : 'No'}</Badge>) : (<Badge variant="outline" className="text-[10px] py-0.5 px-1.5">N/A</Badge>)}</TableCell>
                      <TableCell className="text-xs">
                        {report.modelUsed ? (
                          <Badge variant="outline" className="capitalize text-[10px] py-0.5 px-1.5 flex items-center gap-1">
                            <Cpu className="h-3 w-3" />
                            {modelDisplayMap[report.modelUsed as AIModelName] || report.modelUsed}
                          </Badge>
                        ) : (<Badge variant="outline" className="text-[10px] py-0.5 px-1.5">N/A</Badge>)}
                      </TableCell>
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
         <CardFooter className="border-t p-4 flex flex-wrap gap-2">
             <Button onClick={handleCopyFeedbackLog} disabled={isCopyingFeedbackLog} variant="outline" size="sm">
                <ClipboardCopy className={`mr-2 h-4 w-4 ${isCopyingFeedbackLog ? 'animate-spin' : ''}`} />
                {isCopyingFeedbackLog ? "Copying..." : "Copy Feedback Log"}
            </Button>
            <AlertDialog open={showClearFeedbackDialog} onOpenChange={setShowClearFeedbackDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" /> Clear Feedback Log
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will permanently delete all entries from the Feedback Log. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isClearingFeedbackLog}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={performClearFeedbackLog}
                    disabled={isClearingFeedbackLog}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {isClearingFeedbackLog && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                    Clear Log
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={handleCopyMatchLog} disabled={isCopyingMatchLog} variant="outline" size="sm">
                <ClipboardCopy className={`mr-2 h-4 w-4 ${isCopyingMatchLog ? 'animate-spin' : ''}`} />
                {isCopyingMatchLog ? "Copying..." : "Copy Raw Match Log"}
            </Button>
            <Button onClick={handleCopyDiagnosticLog} disabled={isCopyingDiagnosticLog} variant="outline" size="sm">
                <Bug className={`mr-2 h-4 w-4 ${isCopyingDiagnosticLog ? 'animate-spin' : ''}`} />
                {isCopyingDiagnosticLog ? "Copying..." : "Copy AI Diagnostic Log"}
            </Button>
         </CardFooter>
      </Card>
      <Separator />
      <AdminAIPreferenceInsights />
    </div>
  );
}
