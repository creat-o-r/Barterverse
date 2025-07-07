"use client";

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation'; // Added useSearchParams
import Link from 'next/link';
import { Loader2, UserPlus, Facebook, TwitterIcon } from 'lucide-react'; // Added icons
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator'; // Added Separator

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

function SignupForm() {
  const { signUp, isLoading: authLoading, error: authError } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      await signUp(data.email, data.password, data.name);
      toast({ title: "Signup Successful", description: "Welcome! You are now logged in." });
      router.push('/'); // Redirect to homepage or dashboard
    } catch (error: any) {
      console.error("Signup failed:", error);
      // The authError from useAuth() context might also be set, but explicitly toasting here is fine.
      toast({
        title: "Signup Failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" /> Create Account
          </CardTitle>
          <CardDescription className="font-body">
            Join BarterVerse today to start trading!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" type="text" {...form.register('name')} disabled={isSubmitting || authLoading} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} disabled={isSubmitting || authLoading} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...form.register('password')} disabled={isSubmitting || authLoading} />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>
            {/* Display general auth error from context if it's set and not specific to a field already showing an error */}
            {authError && !form.formState.isDirty && !form.formState.isValid && (
              <p className="text-sm text-destructive">{authError}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
              {isSubmitting || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign Up
            </Button>
          </form>
          <p className="mt-4 text-center text-sm font-body">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SignupForm />
    </Suspense>
  );
}
