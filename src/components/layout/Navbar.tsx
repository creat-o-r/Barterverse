
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, PlusCircle, UserCircle, Menu, ServerCrash, LogOut, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Define link configurations
const primaryNavLinks = [
  { href: '/', label: 'Match', icon: <Package className="h-4 w-4" /> },
  { href: '/items/new', label: 'List Item', icon: <PlusCircle className="h-4 w-4" /> },
  { href: '/chats', label: 'Chats', icon: <MessageSquare className="h-4 w-4" /> },
];
const profileLinkConfig = { href: '/profile/me', label: 'Profile', icon: <UserCircle className="h-4 w-4" /> };
const adminLinkConfig = { href: '/admin/match-reports', label: 'Admin', icon: <ServerCrash className="h-4 w-4" /> };

export default function Navbar() {
  const isLoggedIn = true; // Placeholder for auth state
  const isAdmin = true; // Placeholder for admin state

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center">
        
        {/* Desktop Navigation - Main Links (left-aligned) */}
        <nav className="hidden md:flex items-center gap-1">
          {primaryNavLinks.map((link) => (
            <Button key={link.href} variant="ghost" asChild>
              <Link href={link.href} className="flex items-center gap-2 text-sm px-3 py-2">
                {link.icon}
                {link.label}
              </Link>
            </Button>
          ))}
        </nav>

        {/* Right-aligned items: Profile, Admin Button, Mobile Menu Trigger */}
        <div className="ml-auto flex items-center gap-2">
          {/* Profile Dropdown / Login Button - Desktop */}
          <div className="hidden md:block"> 
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-sm px-3 py-2">
                    {profileLinkConfig.icon}
                    {profileLinkConfig.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="https://placehold.co/100x100.png?text=U" alt="User" data-ai-hint="profile avatar" />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">Current User</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          user@example.com
                        </p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={profileLinkConfig.href}>
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span>View Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <Link href="/auth/signin">Login</Link>
              </Button>
            )}
          </div>

          {/* Admin Report Button - Desktop */}
          {isLoggedIn && isAdmin && (
            <Button variant="ghost" asChild className="hidden md:flex items-center text-sm px-3 py-2">
              <Link href={adminLinkConfig.href} className="flex items-center gap-2">
                {adminLinkConfig.icon}
                {adminLinkConfig.label}
              </Link>
            </Button>
          )}

          {/* Mobile Navigation Trigger */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="flex flex-col gap-4 mt-8">
                  {primaryNavLinks.map((link) => (
                    <Button key={link.href} variant="ghost" asChild className="justify-start">
                      <Link href={link.href} className="flex items-center gap-3 text-base py-2">
                        {link.icon}
                        {link.label}
                      </Link>
                    </Button>
                  ))}
                  {/* Mobile Profile Link */}
                  {isLoggedIn && (
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href={profileLinkConfig.href} className="flex items-center gap-3 text-base py-2">
                        {profileLinkConfig.icon}
                        {profileLinkConfig.label}
                      </Link>
                    </Button>
                  )}
                  {/* Mobile Admin Report Link */}
                  {isLoggedIn && isAdmin && (
                     <Button variant="ghost" asChild className="justify-start">
                      <Link href={adminLinkConfig.href} className="flex items-center gap-3 text-base py-2">
                        {adminLinkConfig.icon}
                        {adminLinkConfig.label}
                      </Link>
                    </Button>
                  )}
                  <hr className="my-2"/>
                  {isLoggedIn ? (
                    <>
                      <div className="px-2 py-1.5 text-sm font-semibold flex items-center gap-3 text-muted-foreground">
                          <Avatar className="h-7 w-7">
                          <AvatarImage src="https://placehold.co/100x100.png?text=U" alt="User" data-ai-hint="profile avatar mobile" />
                          <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                          Current User
                      </div>
                      <Button variant="ghost" className="justify-start text-base py-2">
                        <LogOut className="mr-3 h-4 w-4" />
                        Log out
                      </Button>
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
        </div> {/* End of ml-auto group */}
      </div>
    </header>
  );
}
