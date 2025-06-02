
import { getLoggedMatchSuggestions, type LoggedMatchSuggestion } from '@/services/match-report-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ServerCrash, Link as LinkIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

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
    case 'medium': return <Minus className="h-3 w-3 mr-1" />; // Or another appropriate icon
    case 'low': return <TrendingDown className="h-3 w-3 mr-1" />;
    default: return null;
  }
}


export default async function MatchReportsPage() {
  const reports = await getLoggedMatchSuggestions();

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-3">
            <ServerCrash className="h-8 w-8 text-primary" />
            AI Match Suggestion Admin Report
          </CardTitle>
          <CardDescription className="font-body">
            This report shows AI-generated item match suggestions.
            <br />
            <span className="font-semibold text-destructive-foreground bg-destructive/80 px-2 py-1 rounded-sm inline-block my-1">Important Note:</span> Due to React Strict Mode, you may see duplicate entries in development for each suggestion event; this does not occur in production.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-center text-muted-foreground font-body py-12">No match suggestions have been logged yet.</p>
          ) : (
            <ScrollArea className="h-[calc(100vh-22rem)] w-full border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>For User ID</TableHead>
                    <TableHead>Current Item (Name & Link)</TableHead>
                    <TableHead>Suggested Items (ID & Score)</TableHead>
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
                      <TableCell>
                        {report.suggestedMatches && report.suggestedMatches.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {report.suggestedMatches.map(match => (
                              <div key={match.itemId} className="flex items-center gap-2">
                                <Badge
                                  className={`text-xs py-0.5 px-2 flex items-center ${getMatchScoreColor(match.matchScore)}`}
                                >
                                  {getMatchScoreIcon(match.matchScore)}
                                  {match.matchScore || 'N/A'}
                                </Badge>
                                <Link href={`/items/${match.itemId}`} className="text-xs hover:text-primary hover:underline inline-flex items-center gap-1">
                                  {match.itemId} <LinkIcon className="h-3 w-3" />
                                </Link>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-body text-muted-foreground max-w-sm break-words whitespace-pre-wrap">
                          {report.reasoning || <span className="italic">N/A</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

