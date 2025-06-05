
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Added for admin link styling
import { ServerCrash } from 'lucide-react'; // Added for admin icon

export default function Footer() {
  const isAdmin = true; // Placeholder for admin state

  return (
    <footer className="bg-card shadow-sm border-t">
      <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
        <p className="text-sm font-body">
          &copy; {new Date().getFullYear()} BarterVerse. All rights reserved.
        </p>
        <p className="text-xs font-body mt-1">
          Trade anything, build community.
        </p>
        {isAdmin && (
          <div className="mt-3">
            <Button variant="link" asChild size="sm" className="text-xs text-muted-foreground hover:text-primary">
              <Link href="/admin/match-reports">
                <ServerCrash className="mr-1 h-3.5 w-3.5" /> Admin Panel
              </Link>
            </Button>
          </div>
        )}
      </div>
    </footer>
  );
}
