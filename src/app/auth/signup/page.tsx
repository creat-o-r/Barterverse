import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="font-headline text-3xl">Create Your BarterVerse Account</CardTitle>
          <CardDescription className="font-body">
            Join our community and start bartering today!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-headline">Full Name</Label>
            <Input id="name" type="text" placeholder="Your Name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="font-headline">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-headline">Password</Label>
            <Input id="password" type="password" placeholder="Create a strong password" />
          </div>
           <div className="space-y-2">
            <Label htmlFor="confirm-password" className="font-headline">Confirm Password</Label>
            <Input id="confirm-password" type="password" placeholder="Confirm your password" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full bg-primary hover:bg-primary/90">Sign Up</Button>
          <p className="text-sm text-center text-muted-foreground font-body">
            Already have an account?{' '}
            <Button variant="link" asChild className="p-0 h-auto text-primary">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
