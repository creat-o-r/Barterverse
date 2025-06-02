
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, PlusCircle, Repeat, UserCircle, Menu, ServerCrash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
  { href: '/', label: 'Browse', icon: <Package className="h-4 w-4" /> },
  { href: '/items/new', label: 'List Item', icon: <PlusCircle className="h-4 w-4" /> },
  { href: '/trades', label: 'My Trades', icon: <Repeat className="h-4 w-4" /> },
  { href: '/profile/me', label: 'Profile', icon: <UserCircle className="h-4 w-4" /> },
  { href: '/admin/match-reports', label: 'Admin Reports', icon: <ServerCrash className="h-4 w-4" />, adminOnly: true }, // Added admin link
];

export default function Navbar() {
  const isLoggedIn = true; // Placeholder for auth state
  // In a real app, you'd also have an isAdmin check
  const isAdmin = true; // Placeholder for admin state

  const visibleNavLinks = navLinks.filter(link => !link.adminOnly || (link.adminOnly && isAdmin));

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline text-primary">BarterVerse</h1>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {visibleNavLinks.map((link) => (
            <Button key={link.href} variant="ghost" asChild>
              <Link href={link.href} className="flex items-center gap-2 text-sm px-3 py-2">
                {link.icon}
                {link.label}
              </Link>
            </Button>
          ))}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full ml-2">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="https://placehold.co/100x100.png?text=U" alt="User" data-ai-hint="profile avatar" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Current User</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      user@example.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile/me">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  {/* Placeholder for logout */}
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="ml-2">
              <Link href="/auth/signin">Login</Link>
            </Button>
          )}
        </nav>
        
        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <nav className="flex flex-col gap-4 mt-8">
                {visibleNavLinks.map((link) => (
                  <Button key={link.href} variant="ghost" asChild className="justify-start">
                    <Link href={link.href} className="flex items-center gap-3 text-base py-2">
                      {link.icon}
                      {link.label}
                    </Link>
                  </Button>
                ))}
                <hr className="my-2"/>
                 {isLoggedIn ? (
                  <>
                    <Button variant="ghost" asChild className="justify-start">
                       <Link href="/profile/me" className="flex items-center gap-3 text-base py-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src="https://placehold.co/100x100.png?text=U" alt="User" data-ai-hint="profile avatar" />
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                          Current User
                       </Link>
                    </Button>
                    <Button variant="ghost" className="justify-start text-base py-2">Log out</Button>
                  </>
                 ) : (
                  <Button asChild className="w-full">
                    <Link href="/auth/signin">Login</Link>
                  </Button>
                 )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
