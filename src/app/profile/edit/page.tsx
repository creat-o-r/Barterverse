'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { updateProfile as updateAuthProfile } from 'firebase/auth'; // Renamed to avoid conflict
import type { UserProfileDocument } from '@/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UserCircle, Edit3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Assuming you have this hook

export default function EditProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [displayLocation, setDisplayLocation] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [currentPhotoURL, setCurrentPhotoURL] = useState<string | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.replace('/auth/signin'); // Redirect if not logged in
    }
  }, [authUser, authLoading, router]);

  useEffect(() => {
    if (authUser) {
      const fetchUserProfile = async () => {
        setIsLoadingData(true);
        try {
          const userDocRef = doc(db, 'users', authUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const userProfile = docSnap.data() as UserProfileDocument;
            setDisplayName(userProfile.displayName || '');
            setBio(userProfile.bio || '');
            setDisplayLocation(userProfile.displayLocation || '');
            setCurrentPhotoURL(userProfile.photoURL || null);
            setPhotoPreview(userProfile.photoURL || null);
          } else {
            // User profile doesn't exist in Firestore, use auth data
            setDisplayName(authUser.displayName || authUser.email?.split('@')[0] || '');
            setCurrentPhotoURL(authUser.photoURL || null);
            setPhotoPreview(authUser.photoURL || null);
            toast({ title: "Profile not found in database", description: "Using basic info. Saving will create a new profile entry.", variant: "default" });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          toast({ title: "Error", description: "Could not fetch your profile data.", variant: "destructive" });
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchUserProfile();
    }
  }, [authUser, toast]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(currentPhotoURL); // Revert to current if no file selected
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!authUser) {
      toast({ title: "Not Authenticated", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      let newPhotoURL = currentPhotoURL;

      // 1. Upload new photo if one is selected
      if (photoFile) {
        const photoName = `profile-pictures/${authUser.uid}/${Date.now()}-${photoFile.name}`;
        const storageRef = ref(storage, photoName);
        const uploadTask = uploadBytesResumable(storageRef, photoFile);
        await uploadTask; // Wait for upload to complete
        newPhotoURL = await getDownloadURL(uploadTask.snapshot.ref);
        setCurrentPhotoURL(newPhotoURL); // Update current photo URL state
      }

      // 2. Update Firestore document
      const userDocRef = doc(db, 'users', authUser.uid);
      const updatedProfileData: Partial<UserProfileDocument> = {
        displayName,
        bio,
        displayLocation,
        photoURL: newPhotoURL || '', // Use new or existing photo URL
        // createdAt will be set on initial creation or can be left alone on update
        // email is usually not updated here as it's tied to auth
      };
      // Use setDoc with merge:true if you want to create or update, or updateDoc if sure it exists
      await updateDoc(userDocRef, updatedProfileData);

      // 3. Update Firebase Auth profile
      if (auth.currentUser) { // Ensure auth.currentUser is available
          await updateAuthProfile(auth.currentUser, {
          displayName: displayName,
          photoURL: newPhotoURL,
        });
      }

      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      router.push(`/profile/me`); // Redirect to profile page

    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: error.message || "Could not update your profile.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoadingData) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /> Loading profile editor...</div>;
  }

  if (!authUser && !authLoading) {
     // Should have been redirected, but as a fallback
    return <div className="text-center py-10">Please sign in to edit your profile.</div>;
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline flex items-center gap-2">
            <Edit3 className="h-8 w-8 text-primary" /> Edit Your Profile
          </CardTitle>
          <CardDescription>Update your personal information. Make sure to save your changes.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="font-semibold">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your public name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo" className="font-semibold">Profile Picture</Label>
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <Image src={photoPreview} alt="Profile preview" width={80} height={80} className="rounded-full object-cover h-20 w-20" />
                ) : (
                  <UserCircle className="h-20 w-20 text-gray-300" />
                )}
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="font-semibold">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a little about yourself and what you like to trade."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayLocation" className="font-semibold">Location</Label>
              <Input
                id="displayLocation"
                value={displayLocation}
                onChange={(e) => setDisplayLocation(e.target.value)}
                placeholder="e.g., City, State, Country"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || authLoading || isLoadingData} className="w-full bg-primary hover:bg-primary/90">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
