
import { getLoggedMatchSuggestions, type LoggedMatchSuggestion } from '@/services/match-report-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ServerCrash, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic'; // Ensure fresh data on each request

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
            <span className="font-semibold text-destructive-foreground bg-destructive/80 px-2 py-1 rounded-sm inline-block my-1">Important Note:</span> This data is stored in a local JSON file and may show duplicates in development due to React Strict Mode. For persistent logging, a database solution is required.
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
                    <TableHead>Current Item (Name & ID Link)</TableHead>
                    <TableHead>Suggested Item IDs</TableHead>
                    <TableHead className="min-w-[300px]">Reasoning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report, index) => (
                    <TableRow key={`${report.timestamp}-${report.currentItemId}-${index}`} className={index % 2 === 0 ? 'bg-muted/30' : ''}>
                      <TableCell className="font-mono text-xs">
                        {new Date(report.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{report.triggeringUserId}</TableCell>
                      <TableCell>
                          <div className="font-semibold">{report.currentItemName}</div>
                          <div className="text-xs text-muted-foreground">
                            ID: {' '}
                            <Link href={`/items/${report.currentItemId}`} className="hover:text-primary hover:underline inline-flex items-center gap-1">
                                {report.currentItemId} <LinkIcon className="h-3 w-3" />
                            </Link>
                          </div>
                      </TableCell>
                      <TableCell>
                        {report.suggestedItemIds.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {report.suggestedItemIds.map(id => <Badge key={id} variant="secondary" className="text-xs py-0.5 px-1.5">{id}</Badge>)}
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
