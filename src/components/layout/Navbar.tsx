
import Link from 'next/link';
import React from 'react'; // Import React for React.cloneElement
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, PlusCircle, UserCircle, Menu, LogOut, MessageSquare } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

// Define link configurations
const primaryNavLinks = [
  { href: '/', label: 'Match', icon: <Package className="h-4 w-4" /> },
  { href: '/items/new', label: 'List Item', icon: <PlusCircle className="h-4 w-4" /> },
  { 
    href: '/chats', 
    label: 'Chats', 
    icon: <MessageSquare className="h-4 w-4" />,
    hasNotification: true 
  },
];
const profileLinkConfig = { href: '/profile/me', label: 'Profile', icon: <UserCircle className="h-4 w-4" /> };

export default function Navbar() {
  const isLoggedIn = true; // Placeholder for auth state
  const unreadCount = 3; // Placeholder for unread chat count

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center">
        
        {/* Mobile Icon Navigation (replaces desktop nav on mobile) */}
        <nav className="flex md:hidden items-center gap-1">
          {primaryNavLinks.map((link) => (
            <Button key={`mobile-icon-${link.label}`} variant="ghost" size="icon" asChild>
              <Link href={link.href} aria-label={link.label} className="relative flex items-center justify-center w-10 h-10">
                {React.cloneElement(link.icon, { className: "h-5 w-5" })}
                {link.hasNotification && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-3 w-3 min-w-[0.75rem] rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center p-0.5 leading-none shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
          ))}
        </nav>

        {/* Desktop Navigation - Main Links (left-aligned) */}
        <nav className="hidden md:flex items-center gap-1">
          {primaryNavLinks.map((link) => (
            <Button key={link.label} variant="ghost" asChild>
              <Link href={link.href} className="relative flex items-center gap-2 text-sm px-3 py-2">
                {link.icon}
                {link.label}
                {link.hasNotification && unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 min-w-[1rem] rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center px-1 shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
          ))}
        </nav>

        {/* Right-aligned items: Profile, Mobile Menu Trigger */}
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
          
          {/* Mobile Navigation Trigger */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col p-0">
                <SheetTitle className="font-headline text-lg p-4 border-b">Menu</SheetTitle>
                <nav className="flex flex-col gap-1 p-4 flex-grow"> {/* Changed gap to 1, padding to p-4 */}
                  {isLoggedIn && (
                    <Button variant="ghost" asChild className="justify-start h-auto py-2.5">
                      <Link href={profileLinkConfig.href} className="flex items-center gap-3 text-base">
                        {profileLinkConfig.icon}
                        {profileLinkConfig.label}
                      </Link>
                    </Button>
                  )}
                </nav>
                <div className="mt-auto flex flex-col gap-2 p-4 border-t">
                  {isLoggedIn ? (
                    <>
                      <div className="px-2 py-1.5 text-sm font-semibold flex items-center gap-3 text-muted-foreground">
                          <Avatar className="h-7 w-7">
                          <AvatarImage src="https://placehold.co/100x100.png?text=U" alt="User" data-ai-hint="profile avatar mobile" />
                          <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                          Current User
                      </div>
                      <Button variant="ghost" className="justify-start text-base h-auto py-2.5">
                        <LogOut className="mr-3 h-4 w-4" />
                        Log out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild className="w-full">
                        <Link href="/auth/signin">Login</Link>
                      </Button>
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/auth/signup">Sign Up</Link>
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
