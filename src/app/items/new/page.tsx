
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
import type { User, UserStoredLocation, ItemLogisticsLocationType, ItemLogisticsShippingOption, ItemLogistics } from '@/types';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';

const ITEM_SPECIFIC_LOCATION_VALUE = "item_specific_address_selected";

const itemFormSchema = z.object({
  name: z.string().min(3, { message: 'Item name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().min(2, { message: 'Category is required and should be at least 2 characters.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')),
  listingType: z.enum(['offer', 'want'], { required_error: "You must select a listing type." }),
  minimumMatchRatingOverride: z.enum(['Low', 'Medium', 'High']),
  isGiftItForward: z.boolean().optional(),
  
  selectedLocationIdentifier: z.string().min(1, { message: "Please select or specify an item location."}),
  itemSpecificAddress: z.string().optional(),
  shippingOption: z.custom<ItemLogisticsShippingOption>(
    (val) => ['pickup_only', 'ship_domestic', 'ship_international', 'delivery_area', 'possible_delivery'].includes(val as string),
    { message: "Invalid delivery option." }
  ),
  logisticsNotes: z.string().optional(),
}).refine(data => {
  if (data.selectedLocationIdentifier === ITEM_SPECIFIC_LOCATION_VALUE) {
    return data.itemSpecificAddress && data.itemSpecificAddress.length >= 5;
  }
  return true;
}, {
  message: "Please enter a valid specific address (min 5 characters) if you've chosen to enter one.",
  path: ["itemSpecificAddress"],
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

const shippingOptionMapConcrete: Record<ItemLogisticsShippingOption, string> = {
  pickup_only: "Local Pickup Only",
  ship_domestic: "Willing to Ship (Domestic)",
  ship_international: "Willing to Ship (International)",
  delivery_area: "Delivery Area (Specify in Notes)",
  possible_delivery: "Possible Delivery (Discuss)",
};


export default function NewItemPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [isInferringListingType, setIsInferringListingType] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  useEffect(() => {
    const user = dummyUsers.find(u => u.id === 'user1');
    setCurrentUser(user || null);
  }, []);

  const currentUserProfileRating = currentUser?.minimumMatchRating || 'Low';
  
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
      selectedLocationIdentifier: ITEM_SPECIFIC_LOCATION_VALUE,
      itemSpecificAddress: '',
      shippingOption: 'pickup_only',
      logisticsNotes: '',
    },
  });
  
 useEffect(() => {
    if (currentUser && form.reset) {
        const name = form.getValues('name');
        const description = form.getValues('description');
        const category = form.getValues('category');
        const imageUrl = form.getValues('imageUrl');
        const listingType = form.getValues('listingType');
        const isGiftItForward = form.getValues('isGiftItForward');
        const logisticsNotes = form.getValues('logisticsNotes');
        // Preserve existing form state for non-logistics fields if they exist
        
        let defaultSelectedLocationId: string = ITEM_SPECIFIC_LOCATION_VALUE;
        const preferredStoredLocId = currentUser.logisticsPreferences?.preferredStoredLocationId;

        if (preferredStoredLocId && currentUser.locations?.find(l => l.id === preferredStoredLocId)) {
            defaultSelectedLocationId = preferredStoredLocId;
        } else if (currentUser.locations && currentUser.locations.length > 0 && currentUser.locations[0].id) {
            // Fallback to first stored location if preferred is not set or invalid
            defaultSelectedLocationId = currentUser.locations[0].id;
        }
        // If no stored locations or preferred, it remains ITEM_SPECIFIC_LOCATION_VALUE

        form.reset({
            name: name || '',
            description: description || '',
            category: category || '',
            imageUrl: imageUrl || '',
            listingType: listingType || 'offer',
            minimumMatchRatingOverride: form.getValues('minimumMatchRatingOverride') || currentUser.minimumMatchRating || 'Low',
            isGiftItForward: isGiftItForward || false,
            
            selectedLocationIdentifier: defaultSelectedLocationId,
            itemSpecificAddress: defaultSelectedLocationId === ITEM_SPECIFIC_LOCATION_VALUE ? (form.getValues('itemSpecificAddress') || '') : '',
            shippingOption: currentUser.logisticsPreferences?.defaultShippingOption || 'pickup_only',
            logisticsNotes: logisticsNotes || '',
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, form.reset]); // Added form.reset dependency

  const listingTypeWatch = form.watch('listingType');
  const selectedLocationIdentifierWatch = form.watch('selectedLocationIdentifier');

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
      let itemLogistics: ItemLogistics;
      let locationTypeForLogistics: ItemLogisticsLocationType;
      let storedLocationIdForLogistics: string | undefined = undefined;
      let specificAddressForLogistics: string | undefined = undefined;

      if (data.selectedLocationIdentifier === ITEM_SPECIFIC_LOCATION_VALUE) {
        locationTypeForLogistics = 'item_specific_location';
        specificAddressForLogistics = data.itemSpecificAddress;
      } else { 
        locationTypeForLogistics = 'profile_stored_location';
        storedLocationIdForLogistics = data.selectedLocationIdentifier;
      }
      
      itemLogistics = {
          locationType: locationTypeForLogistics,
          selectedUserStoredLocationId: storedLocationIdForLogistics,
          itemSpecificAddress: specificAddressForLogistics,
          shippingOption: data.shippingOption,
          notes: data.logisticsNotes,
      };

      const newItemData = {
        name: data.name,
        description: data.description,
        category: data.category,
        listingType: data.listingType,
        imageUrl: data.imageUrl || '',
        ownerId: currentUser.id,
        minimumMatchRatingOverride: data.minimumMatchRatingOverride,
        isGiftItForward: data.listingType === 'offer' ? data.isGiftItForward : false,
        logistics: itemLogistics,
      };
      const addedItem = addNewItemToDummyData(newItemData);
      
      toast({
        title: `Item ${data.listingType === 'offer' ? 'Listed' : 'Wanted'}!`,
        description: `${data.name} has been successfully posted.`,
      });
      
      if (currentUser && form.reset) {
        let defaultSelectedLocationId: string = ITEM_SPECIFIC_LOCATION_VALUE;
        const preferredStoredLocId = currentUser.logisticsPreferences?.preferredStoredLocationId;
        if (preferredStoredLocId && currentUser.locations?.find(l => l.id === preferredStoredLocId)) {
            defaultSelectedLocationId = preferredStoredLocId;
        } else if (currentUser.locations && currentUser.locations.length > 0 && currentUser.locations[0].id) {
            defaultSelectedLocationId = currentUser.locations[0].id;
        }

        form.reset({
            name: '', 
            description: '',
            category: '',
            imageUrl: '',
            listingType: 'offer',
            minimumMatchRatingOverride: currentUser.minimumMatchRating || 'Low',
            isGiftItForward: false,
            selectedLocationIdentifier: defaultSelectedLocationId,
            itemSpecificAddress: '',
            shippingOption: currentUser.logisticsPreferences?.defaultShippingOption || 'pickup_only',
            logisticsNotes: '',
        });
      } else {
        form.reset();
      }
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
            Tell us about your item. Logistics fields initialize to your profile defaults. Our AI can help with category and listing type.
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
                <FormField control={form.control} name="minimumMatchRatingOverride" render={({ field }) => (<FormItem><FormLabel className="font-headline">Minimum Match Rating</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={isLoadingOverall}><FormControl><SelectTrigger disabled={isLoadingOverall}><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              </section>

              <Separator />

              <section className="space-y-6">
                <h3 className="font-headline text-xl border-b pb-2 mb-4">Logistics</h3>
                
                <FormField control={form.control} name="selectedLocationIdentifier" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline flex items-center gap-2"><MapPin className="h-5 w-5 text-muted-foreground" />Item Location</FormLabel>
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            if (value !== ITEM_SPECIFIC_LOCATION_VALUE) {
                                form.setValue('itemSpecificAddress', '', {shouldValidate: false});
                            }
                        }} 
                        value={field.value} 
                        disabled={isLoadingOverall}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a location option..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {currentUser.locations && currentUser.locations.length > 0 && currentUser.locations.map((loc: UserStoredLocation) => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name} ({loc.address || 'Address not set'})</SelectItem>
                        ))}
                        <SelectItem value={ITEM_SPECIFIC_LOCATION_VALUE}>Enter a specific address for this item</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                {selectedLocationIdentifierWatch === ITEM_SPECIFIC_LOCATION_VALUE && (
                  <FormField control={form.control} name="itemSpecificAddress" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-headline">Specific Item Address</FormLabel>
                      <FormControl><Input placeholder="e.g., 123 Item Location St, City" {...field} value={field.value ?? ""} disabled={isLoadingOverall} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <FormField control={form.control} name="shippingOption" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline flex items-center gap-2"><Truck className="h-5 w-5 text-muted-foreground" />Delivery</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingOverall}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(shippingOptionMapConcrete).map(([key, label]) => (
                            <SelectItem key={key} value={key as ItemLogisticsShippingOption}>{label}</SelectItem>
                        ))}
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
              
              {listingTypeWatch === 'offer' && (<FormField control={form.control} name="isGiftItForward" render={({ field }) => (<FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-muted/30"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoadingOverall} id="isGiftItForward"/></FormControl><div className="space-y-1 leading-none"><FormLabel htmlFor="isGiftItForward" className="font-headline flex items-center gap-2"><HeartHandshake className="h-5 w-5 text-pink-500" />Gift It Forward</FormLabel><FormDescription className="font-body">Offer this item freely, no direct trade expected.</FormDescription></div></FormItem>)} />)}
              
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
    
