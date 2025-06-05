
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ServerCrash, LogOut } from 'lucide-react'; // Added LogOut

export default function Footer() {
  const isAdmin = true; // Placeholder for admin state
  const isLoggedIn = true; // Placeholder for auth state

  return (
    <footer className="bg-card shadow-sm border-t">
      <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
        <p className="text-sm font-body">
          &copy; {new Date().getFullYear()} BarterVerse. All rights reserved.
        </p>
        <p className="text-xs font-body mt-1">
          Trade anything, build community.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
          {isAdmin && (
            <Button variant="link" asChild size="sm" className="text-xs text-muted-foreground hover:text-primary">
              <Link href="/admin/match-reports">
                <ServerCrash className="mr-1 h-3.5 w-3.5" /> Admin Panel
              </Link>
            </Button>
          )}
          {isLoggedIn && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive">
              <LogOut className="mr-1 h-3.5 w-3.5" />
              Log out
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
}
