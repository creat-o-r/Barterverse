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
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, LogIn, Facebook, TwitterIcon } from 'lucide-react'; // Added Facebook and Twitter icons
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator'; // Added Separator

const signinSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }), // Min 1 for signin, actual check by Firebase
});

type SigninFormValues = z.infer<typeof signinSchema>;

function SigninForm() {
  const { signIn, isLoading: authLoading, error: authError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams(); // To get redirect URL
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SigninFormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: SigninFormValues) => {
    setIsSubmitting(true);
    try {
      await signIn(data.email, data.password);
      toast({ title: "Sign In Successful", description: "Welcome back!" });
      const redirectUrl = searchParams.get('redirect') || '/'; // Get redirect from query or default to home
      router.push(redirectUrl);
    } catch (error: any) {
      console.error("Signin failed:", error);
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid email or password. Please try again.",
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
            <LogIn className="h-6 w-6 text-primary" /> Sign In
          </CardTitle>
          <CardDescription className="font-body">
            Welcome back to BarterVerse!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
            {authError && !form.formState.isDirty && !form.formState.isValid && ( // Show general auth error from context more reliably
               <p className="text-sm text-destructive">{authError}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
              {isSubmitting || authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sign In
            </Button>
          </form>
          <p className="mt-4 text-center text-sm font-body">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="font-semibold text-primary hover:underline">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SigninPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <SigninForm />
    </Suspense>
  );
}
