
'use client';

import Link from 'next/link';
import React from 'react'; // Import React for React.cloneElement
import { Button } from '@/components/ui/button';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'; // Not used currently
import { Package, PlusCircle, UserCircle, MessageSquare, LogIn, UserPlus, LogOut, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalFilter } from '@/contexts/GlobalFilterContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

// Define link configurations
const primaryNavLinks = [
  { href: '/', label: 'Match', icon: <Package className="h-4 w-4" />, requiresAuth: false },
  { href: '/items/new', label: 'List Item', icon: <PlusCircle className="h-4 w-4" />, requiresAuth: true },
  {
    href: '/chats',
    label: 'Chats',
    icon: <MessageSquare className="h-4 w-4" />,
    hasNotification: true,
    requiresAuth: true,
  },
];
const profileLinkConfig = { href: '/profile/me', label: 'Profile', icon: <UserCircle className="h-4 w-4" /> };


function GlobalCategoryFilter() {
  'use client';
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
  const { currentUser, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const isLoggedIn = !!currentUser; // Ensure isLoggedIn is defined based on currentUser
  const unreadCount = 3; // Placeholder for unread chat count - will remain for now

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/'); // Redirect to home or login page after logout
    } catch (error) {
      console.error("Logout failed:", error);
      toast({ title: "Logout Failed", description: "Could not sign you out. Please try again.", variant: "destructive" });
    }
  };

  const filteredPrimaryNavLinks = primaryNavLinks.filter(link => !link.requiresAuth || isLoggedIn); // Now uses the correctly defined isLoggedIn

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
            {filteredPrimaryNavLinks.map((link) => (
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
            {authLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isLoggedIn ? (
              <>
                <Button key="mobile-profile-icon" variant="ghost" size="icon" asChild>
                  <Link href={profileLinkConfig.href} aria-label={profileLinkConfig.label} className="flex items-center justify-center w-9 h-9">
                    {React.cloneElement(profileLinkConfig.icon, { className: "h-5 w-5" })}
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout" className="flex items-center justify-center w-9 h-9">
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
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
            )}
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <div className="mr-4"> 
             <GlobalCategoryFilter />
          </div>
          {filteredPrimaryNavLinks.map((link) => (
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

        <div className="ml-auto hidden md:flex items-center gap-2">
          {authLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isLoggedIn ? (
            <>
              <Button variant="ghost" asChild className="flex items-center gap-2 text-sm px-3 py-2">
                <Link href={profileLinkConfig.href}>
                  {React.cloneElement(profileLinkConfig.icon, { className: "h-4 w-4" })}
                  {profileLinkConfig.label}
                </Link>
              </Button>
              {/* Display user email or name if available */}
              {currentUser.email && (
                <span className="text-sm text-muted-foreground hidden lg:inline">{currentUser.email}</span>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-1.5">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
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
    </header>
  );
}
