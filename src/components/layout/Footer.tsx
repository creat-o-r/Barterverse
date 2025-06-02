export default function Footer() {
  return (
    <footer className="bg-card shadow-sm border-t">
      <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
        <p className="text-sm font-body">
          &copy; {new Date().getFullYear()} BarterVerse. All rights reserved.
        </p>
        <p className="text-xs font-body mt-1">
          Trade anything, build community.
        </p>
      </div>
    </footer>
  );
}
