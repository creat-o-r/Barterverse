
import Link from 'next/link';
import React from 'react'; // Import React for React.cloneElement
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, PlusCircle, UserCircle, LogOut, MessageSquare } from 'lucide-react'; // Removed Menu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          {isLoggedIn && (
            <Button key="mobile-profile-icon" variant="ghost" size="icon" asChild>
              <Link href={profileLinkConfig.href} aria-label={profileLinkConfig.label} className="flex items-center justify-center w-10 h-10">
                {React.cloneElement(profileLinkConfig.icon, { className: "h-5 w-5" })}
              </Link>
            </Button>
          )}
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

        {/* Right-aligned items: Profile Dropdown / Login Button */}
        <div className="ml-auto flex items-center">
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
                  {/* Logout option removed from dropdown */}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <Link href="/auth/signin">Login</Link>
              </Button>
            )}
          </div>

          {/* Mobile Login/Signup Buttons (if not logged in, and no hamburger menu) */}
          <div className="flex md:hidden items-center gap-2">
            {!isLoggedIn && (
              <>
                <Button variant="default" size="sm" asChild>
                  <Link href="/auth/signin">Login</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
