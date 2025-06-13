
'use client';

import Link from 'next/link';
import React from 'react'; // Import React for React.cloneElement
import { Button, buttonVariants } from '@/components/ui/button'; // Imported buttonVariants
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, PlusCircle, UserCircle, MessageSquare, LogIn, UserPlus, ListPlus, LogOut, LayoutDashboard, LayoutGrid } from 'lucide-react'; // Added LayoutGrid
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalFilter } from '@/contexts/GlobalFilterContext';
import { useAuth } from '../../contexts/AuthContext'; // Adjusted path
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

// Define link configurations
const primaryNavLinksBase = [
  { href: '/', label: 'Match', icon: <Package className="h-4 w-4" /> },
  { href: '/items', label: 'Browse', icon: <LayoutGrid className="h-4 w-4" /> }, // Added Browse link
  // { href: '/items/new', label: 'List Item', icon: <PlusCircle className="h-4 w-4" /> }, // Moved to conditional
  { href: '/quick-list', label: 'Quick List', icon: <ListPlus className="h-4 w-4" /> },
];

const getPrimaryNavLinks = (isLoggedIn: boolean, unreadCount: number) => {
  const links = [...primaryNavLinksBase];
  if (isLoggedIn) {
    links.splice(2, 0, { href: '/items/new', label: 'List Item', icon: <PlusCircle className="h-4 w-4" /> }); // Add "List Item" if logged in
    links.push({ // Add "Chats" link also only if logged in
      href: '/chats',
      label: 'Chats',
      icon: <MessageSquare className="h-4 w-4" />,
      hasNotification: unreadCount > 0, // isLoggedIn is true here
      unreadCount: unreadCount,
    });
  }
  return links;
};

const getProfileLinkConfig = (userId?: string) => ({
   href: userId ? `/profile/${userId}` : '/profile/me', // Default or specific user
   label: 'Profile',
   icon: <UserCircle className="h-4 w-4" />
  });

function GlobalCategoryFilter() {
  // 'use client' is already at the top of the file
  const { selectedCategory, setSelectedCategory, availableCategories } = useGlobalFilter();

  return (
    <div className="flex items-center">
      <Select
        value={selectedCategory || "any"}
        onValueChange={(value) => {
          setSelectedCategory(value === "any" ? null : value);
        }}
      >
        <SelectTrigger className="w-auto max-w-[120px] sm:max-w-[140px] text-xs h-9 px-2 md:w-[180px] md:text-sm md:px-3 md:h-10 md:max-w-none bg-background">
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          {availableCategories.map(category => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const isLoggedIn = !!user;
  const unreadCount = 3; // Placeholder for unread chat count - this should ideally come from user data or another context
  const profileLinkConfig = getProfileLinkConfig(user?.uid);
  const primaryNavLinks = getPrimaryNavLinks(isLoggedIn, unreadCount);

  // Mobile Auth Buttons
  const MobileAuthButtons = () => {
    if (loading) {
      return <Skeleton className="h-8 w-8 rounded-full" />;
    }
    if (isLoggedIn && user) { // Ensure user object is available
      return (
        <>
          <Button key="mobile-profile-icon" variant="ghost" size="icon" asChild className="rounded-full">
            <Link href={profileLinkConfig.href} aria-label={profileLinkConfig.label} className="flex items-center justify-center w-9 h-9">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                <AvatarFallback>{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Sign Out" className="flex items-center justify-center w-9 h-9">
            <LogOut className="h-5 w-5" />
          </Button>
        </>
      );
    }
    return (
      <>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/auth/signin" aria-label="Login" className="flex items-center justify-center w-9 h-9">
            <LogIn className="h-5 w-5" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/auth/signup" aria-label="Sign Up" className="flex items-center justify-center w-9 h-9">
            <UserPlus className="h-5 w-5" />
          </Link>
        </Button>
      </>
    );
  };

  // Desktop Auth Buttons
  const DesktopAuthButtons = () => {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-9 w-24" /> {/* For email */}
          <Skeleton className="h-9 w-24" /> {/* For sign out */}
        </div>
      );
    }
    if (isLoggedIn && user) { // Ensure user object is available
      return (
        <div className="flex items-center gap-3"> {/* Increased gap slightly for avatar */}
          <Link href={profileLinkConfig.href} className="flex items-center gap-2 text-sm font-medium hover:text-primary">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
              <AvatarFallback>{(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            {/* {profileLinkConfig.label} Display name can be next to email or implicit with avatar */}
          </Link>
          {user.displayName && <span className="text-sm text-foreground hidden md:inline">{user.displayName}</span>}
          {!user.displayName && user.email && <span className="text-sm text-muted-foreground hidden lg:inline">{user.email}</span>}
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Sign Out</span>
          </Button>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" asChild>
          <Link href="/auth/signin">Login</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/auth/signup">Sign Up</Link>
        </Button>
      </div>
    );
  };

  return (
    <header className="bg-card shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center">

        {/* Mobile Navigation */}
        <div className="w-full flex md:hidden items-center h-full">
          {/* Left: Category Filter */}
          <div className="flex-none mr-2"> 
            <GlobalCategoryFilter />
          </div>

          {/* Center: Primary Nav Icons */}
          <nav className="flex items-center gap-1"> 
            {primaryNavLinks.map((link) => (
              <Button key={`mobile-icon-${link.label}`} variant="ghost" size="icon" asChild>
                <Link href={link.href} aria-label={link.label} className="relative flex items-center justify-center w-9 h-9">
                  {React.cloneElement(link.icon, { className: "h-5 w-5" })}
                  {link.hasNotification && unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 h-3 w-3 min-w-[0.75rem] rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center p-0.5 leading-none shadow-sm">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              </Button>
            ))}
          </nav>

          {/* Right: Auth/Profile Icons */}
          <div className="flex-none flex items-center gap-0.5 ml-auto">
            <MobileAuthButtons />
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <div className="mr-4"> 
             <GlobalCategoryFilter />
          </div>
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

        <div className="ml-auto hidden md:flex items-center">
          <DesktopAuthButtons />
        </div>
      </div>
    </header>
  );
}
