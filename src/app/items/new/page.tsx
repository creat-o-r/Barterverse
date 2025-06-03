
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, Sparkles, Loader2, Gift, Search, Filter, HeartHandshake, MapPin, Truck, Users2, Edit2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { suggestCategory, type SuggestCategoryOutput } from '@/ai/flows/suggest-category-flow';
import { inferListingType, type InferListingTypeOutput } from '@/ai/flows/infer-listing-type-flow';
import { useState, useCallback, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { addNewItemToDummyData, dummyUsers } from '@/lib/dummy-data';
import type { User, UserStoredLocation, ItemLogisticsLocationType, ItemLogisticsShippingOption, ItemLogisticsMeetupOption } from '@/types';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';

const itemFormSchema = z.object({
  name: z.string().min(3, { message: 'Item name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().min(2, { message: 'Category is required and should be at least 2 characters.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')),
  listingType: z.enum(['offer', 'want'], { required_error: "You must select a listing type." }),
  minimumMatchRatingOverride: z.enum(['Low', 'Medium', 'High']),
  isGiftItForward: z.boolean().optional(),
  // Logistics fields
  locationType: z.custom<ItemLogisticsLocationType>(
    (val) => ['profile_default_location', 'profile_stored_location', 'item_specific_location'].includes(val as string),
    { message: "Invalid location type." }
  ),
  selectedUserStoredLocationId: z.string().optional(),
  itemSpecificAddress: z.string().optional(),
  shippingOption: z.custom<ItemLogisticsShippingOption>(
    (val) => ['profile_default_shipping', 'pickup_only', 'ship_domestic', 'ship_international'].includes(val as string),
    { message: "Invalid shipping option." }
  ),
  meetupOption: z.custom<ItemLogisticsMeetupOption>(
    (val) => ['profile_default_meetup', 'public_meetup', 'flexible'].includes(val as string),
    { message: "Invalid meetup option." }
  ),
  logisticsNotes: z.string().optional(),
}).refine(data => {
  if (data.locationType === 'profile_stored_location' && !data.selectedUserStoredLocationId) {
    return false;
  }
  return true;
}, {
  message: "Please select a stored address.",
  path: ["selectedUserStoredLocationId"],
}).refine(data => {
  if (data.locationType === 'item_specific_location' && (!data.itemSpecificAddress || data.itemSpecificAddress.length < 5)) {
    return false;
  }
  return true;
}, {
  message: "Please enter a valid specific address (min 5 characters).",
  path: ["itemSpecificAddress"],
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

export default function NewItemPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [isInferringListingType, setIsInferringListingType] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulate fetching current user. In a real app, this would come from auth context.
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Simulate fetching user data
    const user = dummyUsers.find(u => u.id === 'user1'); // Assuming user1 is the current user
    setCurrentUser(user || null);
  }, []);


  const currentUserProfileRating = currentUser?.minimumMatchRating || 'Low';
  const defaultUserLocationId = currentUser?.logisticsPreferences?.preferredStoredLocationId || currentUser?.locations?.[0]?.id;
  const defaultUserShipping = currentUser?.logisticsPreferences?.defaultShippingOption || 'ship_domestic';
  const defaultUserMeetup = currentUser?.logisticsPreferences?.defaultMeetupOption || 'public_meetup';


  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      imageUrl: '',
      listingType: 'offer',
      minimumMatchRatingOverride: currentUserProfileRating,
      isGiftItForward: false,
      locationType: 'profile_default_location',
      selectedUserStoredLocationId: '',
      itemSpecificAddress: '',
      shippingOption: 'profile_default_shipping',
      meetupOption: 'profile_default_meetup',
      logisticsNotes: '',
    },
  });
  
  useEffect(() => {
    if (currentUser) {
        form.reset({
            name: '',
            description: '',
            category: '',
            imageUrl: '',
            listingType: 'offer',
            minimumMatchRatingOverride: currentUser.minimumMatchRating || 'Low',
            isGiftItForward: false,
            locationType: 'profile_default_location',
            selectedUserStoredLocationId: '',
            itemSpecificAddress: '',
            shippingOption: 'profile_default_shipping',
            meetupOption: 'profile_default_meetup',
            logisticsNotes: '',
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, form.reset]);


  const listingType = form.watch('listingType');
  const locationType = form.watch('locationType');

  const handleAiSuggestions = useCallback(async () => {
    const name = form.getValues('name');
    const description = form.getValues('description');

    if (name.length < 3 || description.length < 10) return;

    if (!form.formState.dirtyFields.category) {
        setIsSuggestingCategory(true);
        try {
            const categoryResult: SuggestCategoryOutput = await suggestCategory({ name, description });
            if (categoryResult.errorMessage) toast({ title: "AI Category Suggestion Failed", description: categoryResult.errorMessage, variant: "default" });
            else if (categoryResult.suggestedCategory) {
                form.setValue('category', categoryResult.suggestedCategory, { shouldValidate: true });
                toast({ title: "AI Category Suggested!", description: `We've suggested "${categoryResult.suggestedCategory}".` });
            }
        } catch (error: any) {
            toast({ title: "AI System Error (Category)", description: `Could not connect. ${error.message || ''}`, variant: "destructive" });
        } finally { setIsSuggestingCategory(false); }
    }

    if (!form.formState.dirtyFields.listingType) {
        setIsInferringListingType(true);
        try {
            const listingTypeResult: InferListingTypeOutput = await inferListingType({ name, description });
            if (listingTypeResult.errorMessage) toast({ title: "AI Listing Type Inference Failed", description: listingTypeResult.errorMessage, variant: "default" });
            else if (listingTypeResult.inferredListingType) {
                form.setValue('listingType', listingTypeResult.inferredListingType, { shouldValidate: true });
                toast({ title: "AI Listing Type Inferred!", description: `Inferred as an "${listingTypeResult.inferredListingType}".` });
            }
        } catch (error: any) {
            toast({ title: "AI System Error (Listing Type)", description: `Could not connect. ${error.message || ''}`, variant: "destructive" });
        } finally { setIsInferringListingType(false); }
    }
  }, [form, toast]);


  async function onSubmit(data: ItemFormValues) {
    if (!currentUser) {
      toast({ title: "Error", description: "Current user not loaded.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const newItemData = {
        name: data.name,
        description: data.description,
        category: data.category,
        listingType: data.listingType,
        imageUrl: data.imageUrl || '',
        ownerId: currentUser.id,
        minimumMatchRatingOverride: data.minimumMatchRatingOverride,
        isGiftItForward: data.listingType === 'offer' ? data.isGiftItForward : false,
        logistics: {
            locationType: data.locationType,
            selectedUserStoredLocationId: data.locationType === 'profile_stored_location' ? data.selectedUserStoredLocationId : undefined,
            itemSpecificAddress: data.locationType === 'item_specific_location' ? data.itemSpecificAddress : undefined,
            shippingOption: data.shippingOption,
            meetupOption: data.meetupOption,
            notes: data.logisticsNotes,
        }
      };
      const addedItem = addNewItemToDummyData(newItemData);
      
      toast({
        title: `Item ${data.listingType === 'offer' ? 'Listed' : 'Wanted'}!`,
        description: `${data.name} has been successfully posted.`,
      });
      form.reset();
      router.push(`/items/${addedItem.id}`);
    } catch (error: any) {
        toast({ title: "Submission Error", description: error.message || "Could not post item.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const isLoadingAi = isSuggestingCategory || isInferringListingType;
  const isLoadingOverall = isLoadingAi || isSubmitting || !currentUser;

  if (!currentUser) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading user data...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-2">
            <PlusCircle className="h-8 w-8 text-primary" />
            List an Item
          </CardTitle>
          <CardDescription className="font-body">
            Tell us about your item. Our AI can help with category and listing type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <section className="space-y-6">
                <h3 className="font-headline text-xl border-b pb-2 mb-4">Item Details</h3>
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel className="font-headline">Item Name</FormLabel><FormControl><Input placeholder="e.g., Vintage Leather Journal" {...field} disabled={isLoadingOverall} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel className="font-headline">Description</FormLabel><FormControl><Textarea placeholder="Condition, features, etc." className="resize-none" rows={5} {...field} disabled={isLoadingOverall} onBlur={() => { field.onBlur(); if (!form.formState.dirtyFields.category || !form.formState.dirtyFields.listingType) { handleAiSuggestions(); }}} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="listingType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel className="font-headline flex items-center gap-2">Listing Type {isInferringListingType && <Loader2 className="h-4 w-4 animate-spin text-primary" />} {!isInferringListingType && form.formState.dirtyFields.listingType && <Sparkles className="h-4 w-4 text-accent" />}</FormLabel><FormControl><RadioGroup onValueChange={(value) => { field.onChange(value); form.setValue('listingType', value as 'offer' | 'want', {shouldDirty: true}); }} value={field.value} className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4" disabled={isLoadingOverall}><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="offer" id="offer" disabled={isLoadingOverall} /></FormControl><FormLabel htmlFor="offer" className="font-normal flex items-center gap-2"><Gift className="h-5 w-5 text-green-600" /> Offering an item</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="want" id="want" disabled={isLoadingOverall} /></FormControl><FormLabel htmlFor="want" className="font-normal flex items-center gap-2"><Search className="h-5 w-5 text-blue-600" /> Looking for an item</FormLabel></FormItem></RadioGroup></FormControl><FormDescription className="font-body">AI may suggest this.</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel className="font-headline flex items-center gap-2">Category {isSuggestingCategory && <Loader2 className="h-4 w-4 animate-spin text-primary" />} {!isSuggestingCategory && form.formState.dirtyFields.category && <Sparkles className="h-4 w-4 text-accent" />}</FormLabel><FormControl><Input placeholder={isSuggestingCategory ? "AI suggesting..." : "e.g., Books"} {...field} onChange={(e) => { field.onChange(e); form.setValue('category', e.target.value, {shouldDirty: true});}} disabled={isLoadingOverall} /></FormControl><FormDescription className="font-body">AI may suggest. Type to override.</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="imageUrl" render={({ field }) => (<FormItem><FormLabel className="font-headline">Image URL (Optional)</FormLabel><FormControl><Input type="url" placeholder="https://placehold.co/600x400.png" {...field} disabled={isLoadingOverall}/></FormControl><FormDescription className="font-body">Link to an image. Use placeholder if needed.</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="minimumMatchRatingOverride" render={({ field }) => (<FormItem><FormLabel className="font-headline">Minimum Match Rating</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoadingOverall}><FormControl><SelectTrigger disabled={isLoadingOverall}><SelectValue placeholder={`Using profile default: ${currentUser?.minimumMatchRating || 'Low'}`} /></SelectTrigger></FormControl><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                {listingType === 'offer' && (<FormField control={form.control} name="isGiftItForward" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-muted/30"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoadingOverall} id="isGiftItForward"/></FormControl><div className="space-y-1 leading-none"><FormLabel htmlFor="isGiftItForward" className="font-headline flex items-center gap-2"><HeartHandshake className="h-5 w-5 text-pink-500" />Gift It Forward</FormLabel><FormDescription className="font-body">Offer this item freely, no direct trade expected.</FormDescription></div></FormItem>)} />)}
              </section>

              <Separator />

              <section className="space-y-6">
                <h3 className="font-headline text-xl border-b pb-2 mb-4">Logistics</h3>
                <FormField control={form.control} name="locationType" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-headline flex items-center gap-2"><MapPin className="h-5 w-5 text-muted-foreground" />Item Location</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2" disabled={isLoadingOverall}>
                        <FormItem className="flex items-center space-x-3"><FormControl><RadioGroupItem value="profile_default_location" /></FormControl><FormLabel className="font-normal">Use my profile default location</FormLabel></FormItem>
                        {(currentUser.locations && currentUser.locations.length > 0) && <FormItem className="flex items-center space-x-3"><FormControl><RadioGroupItem value="profile_stored_location" /></FormControl><FormLabel className="font-normal">Use one of my stored addresses</FormLabel></FormItem>}
                        <FormItem className="flex items-center space-x-3"><FormControl><RadioGroupItem value="item_specific_location" /></FormControl><FormLabel className="font-normal">Enter a specific address for this item</FormLabel></FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {locationType === 'profile_stored_location' && (
                  <FormField control={form.control} name="selectedUserStoredLocationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">Select Stored Address</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingOverall || !(currentUser.locations && currentUser.locations.length > 0)}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a stored address" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {currentUser.locations?.map((loc: UserStoredLocation) => (
                            <SelectItem key={loc.id} value={loc.id}>{loc.name} ({loc.address || 'Address not set'})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {locationType === 'item_specific_location' && (
                  <FormField control={form.control} name="itemSpecificAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">Specific Item Address</FormLabel>
                      <FormControl><Input placeholder="e.g., 123 Item Location St" {...field} disabled={isLoadingOverall} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="shippingOption" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline flex items-center gap-2"><Truck className="h-5 w-5 text-muted-foreground" />Shipping Preference</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingOverall}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select shipping option" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="profile_default_shipping">Use profile default (Currently: {currentUser.logisticsPreferences?.defaultShippingOption.replace(/_/g, ' ') || 'Not Set'})</SelectItem>
                        <SelectItem value="pickup_only">Local Pickup Only</SelectItem>
                        <SelectItem value="ship_domestic">Willing to Ship (Domestic)</SelectItem>
                        <SelectItem value="ship_international">Willing to Ship (International)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="meetupOption" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline flex items-center gap-2"><Users2 className="h-5 w-5 text-muted-foreground" />Meetup Preference</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingOverall}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select meetup option" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="profile_default_meetup">Use profile default (Currently: {currentUser.logisticsPreferences?.defaultMeetupOption.replace(/_/g, ' ') || 'Not Set'})</SelectItem>
                        <SelectItem value="public_meetup">Public Meetup Preferred</SelectItem>
                        <SelectItem value="flexible">Flexible Meetup</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField
                  control={form.control}
                  name="logisticsNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline flex items-center gap-2"><Edit2 className="h-5 w-5 text-muted-foreground" />Logistics Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional details about pickup, shipping, or meeting up (e.g., 'Available for pickup on weekends only')."
                          className="resize-none"
                          rows={3}
                          {...field}
                          disabled={isLoadingOverall}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
              
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoadingOverall}>
                {isLoadingOverall ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isSubmitting ? 'Posting...' : (isSuggestingCategory ? 'Suggesting...' : (isInferringListingType ? 'Inferring...' : 'Loading...'))}</>) : (`Post ${form.getValues('listingType') === 'offer' ? 'Offer' : 'Want'} Listing`)}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
