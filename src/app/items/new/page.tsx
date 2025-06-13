
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Sparkles, Loader2, Gift, Search, HeartHandshake, MapPin, Truck, Edit2, Network, CalendarDays, Clock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { suggestCategory, type SuggestCategoryOutput } from '@/ai/flows/suggest-category-flow';
import { inferListingType, type InferListingTypeOutput } from '@/ai/flows/infer-listing-type-flow';
import { useState, useCallback, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { addNewItemToDummyData, dummyUsers } from '@/lib/dummy-data';
import type { User, UserStoredLocation, ItemLogisticsLocationType, ItemDeliveryMethod, ItemLogistics, ItemTimingType, ItemTiming } from '@/types';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useGlobalFilter } from '@/contexts/GlobalFilterContext';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

const ITEM_SPECIFIC_LOCATION_VALUE = "item_specific_address_selected";
const NO_LOCATION_SPECIFIED_VALUE = "no_location_specified_for_item";

const deliveryMethodEnum = z.enum([
  'pickup_only',
  'willing_to_ship',
  'delivery_area',
  'possible_delivery',
  'public_meetup',
  'flexible_meetup'
]);

const itemFormSchemaBase = z.object({
  title: z.string().min(3, { message: 'Item title must be at least 3 characters.' }), // Renamed name to title
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().min(2, { message: 'Category is required and should be at least 2 characters.' }),
  // imageUrl is handled by file input, so schema might not need it, or it's populated post-upload.
  // For now, let's keep it optional as a string that will hold the download URL.
  imageUrl: z.string().url({ message: 'Image URL will be populated after upload.' }).optional().or(z.literal('')),
  listingType: z.enum(['offer', 'want'], { required_error: "You must select a listing type." }),
  isGiftItForward: z.boolean().optional(),
  openToAnyOpportunity: z.boolean().optional(),

  selectedLocationIdentifier: z.string().min(1, { message: "Please select a location option or 'Not Specified'."}), 
  itemSpecificAddress: z.string().optional(),
  deliveryMethods: z.array(deliveryMethodEnum).min(1, { message: "Please select at least one delivery method." }),
  logisticsNotes: z.string().optional(),

  timingType: z.enum(['flexible', 'fixed_date']).optional(),
  timingFixedDate: z.string().optional(), 
});

const itemFormSchema = itemFormSchemaBase.refine(data => {
  if (data.selectedLocationIdentifier === ITEM_SPECIFIC_LOCATION_VALUE) {
    return data.itemSpecificAddress && data.itemSpecificAddress.trim().length >= 5;
  }
  return true;
}, {
  message: "Please enter a valid specific address (min 5 characters) if you've chosen to enter one.",
  path: ["itemSpecificAddress"],
}).refine(data => {
  if (data.timingType === 'fixed_date') {
    return data.timingFixedDate && data.timingFixedDate.trim() !== '';
  }
  return true;
}, {
  message: "Please enter a date if timing type is 'Fixed Date'.",
  path: ["timingFixedDate"],
});


type ItemFormValues = z.infer<typeof itemFormSchema>;

const deliveryMethodMapConcrete: Record<ItemDeliveryMethod, string> = {
  pickup_only: "Pickup",
  willing_to_ship: "Willing to Ship",
  delivery_area: "Delivery Area (Specify in Notes)",
  possible_delivery: "Possible Delivery (Discuss)",
  public_meetup: "Public Meetup",
  flexible_meetup: "Flexible Meetup",
};


export default function NewItemPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { selectedCategory: globalSelectedCategory } = useGlobalFilter();
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [isInferringListingType, setIsInferringListingType] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [currentUser, setCurrentUser] = useState<User | null>(null); // Replaced by useAuth
  const { user: currentUser, loading: authLoading } = useAuth(); // Use Firebase auth user
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // Firebase services
  const { db, storage } = await import('../../../lib/firebase'); // Use await import for client component
  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');


  // Remove useEffect that loads dummy user

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      title: '', // Renamed name to title
      description: '',
      category: globalSelectedCategory || '',
      imageUrl: '', // This will be set after upload
      listingType: 'offer',
      isGiftItForward: false,
      openToAnyOpportunity: false,
      selectedLocationIdentifier: NO_LOCATION_SPECIFIED_VALUE, 
      itemSpecificAddress: '',
      deliveryMethods: ['pickup_only'],
      logisticsNotes: '',
      timingType: 'flexible',
      timingFixedDate: undefined,
    },
  });

  useEffect(() => {
    if (globalSelectedCategory && !form.formState.dirtyFields.category) {
      form.setValue('category', globalSelectedCategory, { shouldValidate: true });
    }
  }, [globalSelectedCategory, form, form.formState.dirtyFields.category]);


 useEffect(() => {
    if (currentUser && form.reset) {
        const currentFormValues = form.getValues(); 

        let defaultSelectedLocationId: string = NO_LOCATION_SPECIFIED_VALUE;
        const preferredStoredLocId = currentUser.logisticsPreferences?.preferredStoredLocationId;

        if (preferredStoredLocId && currentUser.locations?.find(l => l.id === preferredStoredLocId)) {
            defaultSelectedLocationId = preferredStoredLocId;
        }
        
        const defaultDeliveryMethods = currentUser.logisticsPreferences?.defaultDeliveryMethods || ['pickup_only'];

        form.reset({
            ...currentFormValues, 
            category: globalSelectedCategory || currentFormValues.category || '',
            openToAnyOpportunity: currentFormValues.openToAnyOpportunity || false,
            selectedLocationIdentifier: currentFormValues.selectedLocationIdentifier && currentFormValues.selectedLocationIdentifier !== NO_LOCATION_SPECIFIED_VALUE ? currentFormValues.selectedLocationIdentifier : defaultSelectedLocationId,
            itemSpecificAddress: (currentFormValues.selectedLocationIdentifier === ITEM_SPECIFIC_LOCATION_VALUE) ? (currentFormValues.itemSpecificAddress || '') : '',
            deliveryMethods: currentFormValues.deliveryMethods?.length ? currentFormValues.deliveryMethods : defaultDeliveryMethods,
            timingType: currentFormValues.timingType || 'flexible',
            timingFixedDate: currentFormValues.timingFixedDate || undefined,
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, form.reset, globalSelectedCategory]);

  const listingTypeWatch = form.watch('listingType');
  const selectedLocationIdentifierWatch = form.watch('selectedLocationIdentifier');
  const timingTypeWatch = form.watch('timingType');

  const handleAiSuggestions = useCallback(async () => {
    const title = form.getValues('title'); // Use title
    const description = form.getValues('description');

    if (title.length < 3 || description.length < 10) return;

    if (!form.formState.dirtyFields.category && !globalSelectedCategory) {
        setIsSuggestingCategory(true);
        try {
            const categoryResult: SuggestCategoryOutput = await suggestCategory({ name: title, description }); // Pass title as name to AI flow
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
            const listingTypeResult: InferListingTypeOutput = await inferListingType({ name: title, description }); // Pass title as name to AI flow
            if (listingTypeResult.errorMessage) toast({ title: "AI Listing Type Inference Failed", description: listingTypeResult.errorMessage, variant: "default" });
            else if (listingTypeResult.inferredListingType) {
                form.setValue('listingType', listingTypeResult.inferredListingType, { shouldValidate: true });
                toast({ title: "AI Listing Type Inferred!", description: `Inferred as an "${listingTypeResult.inferredListingType}".` });
            }
        } catch (error: any) {
            toast({ title: "AI System Error (Listing Type)", description: `Could not connect. ${error.message || ''}`, variant: "destructive" });
        } finally { setIsInferringListingType(false); }
    }
  }, [form, toast, globalSelectedCategory]);


  async function onSubmit(data: ItemFormValues) {
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to list an item.", variant: "destructive" });
      router.push('/auth/signin');
      return;
    }
    if (!imageFile) {
      toast({ title: "Image Required", description: "Please select an image for your item.", variant: "destructive" });
      // Optionally, trigger form validation error display for image field if using Controller
      form.setError("imageUrl", { type: "manual", message: "Image is required." }); // Example if imageUrl was part of form
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload image to Firebase Storage
      const imageName = `items/${currentUser.uid}/${Date.now()}-${imageFile.name}`;
      const storageRef = ref(storage, imageName);
      const uploadTask = uploadBytesResumable(storageRef, imageFile);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Optional: handle progress (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + (snapshot.bytesTransferred / snapshot.totalBytes) * 100 + '% done');
          },
          (error) => {
            console.error("Image Upload Error:", error);
            toast({ title: "Image Upload Failed", description: error.message, variant: "destructive" });
            reject(error);
          },
          () => {
            resolve();
          }
        );
      });

      const uploadedImageUrl = await getDownloadURL(uploadTask.snapshot.ref);

      // 2. Prepare item data for Firestore
      let locationTypeForLogistics: ItemLogisticsLocationType;
      let storedLocationIdForLogistics: string | undefined = undefined;
      let specificAddressForLogistics: string | undefined = undefined;

      if (data.selectedLocationIdentifier === NO_LOCATION_SPECIFIED_VALUE) {
        locationTypeForLogistics = 'not_specified';
      } else if (data.selectedLocationIdentifier === ITEM_SPECIFIC_LOCATION_VALUE) {
        locationTypeForLogistics = 'item_specific_location';
        specificAddressForLogistics = data.itemSpecificAddress;
      } else {
        locationTypeForLogistics = 'profile_stored_location';
        storedLocationIdForLogistics = data.selectedLocationIdentifier;
      }

      let itemTiming: ItemTiming | undefined = undefined;
      if (data.timingType) {
        itemTiming = { type: data.timingType as ItemTimingType };
        if (data.timingType === 'fixed_date' && data.timingFixedDate) {
          itemTiming.date = data.timingFixedDate;
        }
      }

      const itemLogistics: ItemLogistics = {
          locationType: locationTypeForLogistics,
          selectedUserStoredLocationId: storedLocationIdForLogistics,
          itemSpecificAddress: specificAddressForLogistics,
          deliveryMethods: data.deliveryMethods,
          timing: itemTiming,
          notes: data.logisticsNotes,
      };

      const ownerName = currentUser.displayName || currentUser.email || 'Anonymous User';

      const itemToSave = {
        title: data.title,
        description: data.description,
        category: data.category,
        listingType: data.listingType,
        imageUrl: uploadedImageUrl,
        ownerId: currentUser.uid,
        ownerName: ownerName,
        status: 'available',
        createdAt: serverTimestamp(), // Or new Date() if serverTimestamp gives issues with type
        isGiftItForward: data.listingType === 'offer' ? data.isGiftItForward : false,
        openToAnyOpportunity: data.openToAnyOpportunity,
        logistics: itemLogistics,
        // dataAiHint is not in the form, can be added later if needed
      };

      // 3. Save item to Firestore
      const itemsCollectionRef = collection(db, "items");
      const docRef = await addDoc(itemsCollectionRef, itemToSave);
      console.log("Document written with ID: ", docRef.id);

      toast({
        title: `Item ${data.listingType === 'offer' ? 'Listed' : 'Wanted'}!`,
        description: `${data.title} has been successfully posted.`,
      });

      setImageFile(null); // Clear selected file
      setImagePreview(null); // Clear preview

      // Reset form
      if (form.reset) { // Check if form.reset is available
        // Simplified reset, original logic for logistics defaults can be re-added if User type from useAuth matches dummyUser type
        let defaultSelectedLocationId: string = NO_LOCATION_SPECIFIED_VALUE;
        // const preferredStoredLocId = currentUser?.logisticsPreferences?.preferredStoredLocationId; // Assuming currentUser has these details
        // if (preferredStoredLocId && currentUser?.locations?.find(l => l.id === preferredStoredLocId)) {
        //     defaultSelectedLocationId = preferredStoredLocId;
        // }
        // const defaultDeliveryMethods = currentUser?.logisticsPreferences?.defaultDeliveryMethods || ['pickup_only'];

        form.reset({
            title: '',
            description: '',
            category: globalSelectedCategory || '',
            imageUrl: '',
            listingType: 'offer',
            isGiftItForward: false,
            openToAnyOpportunity: false,
            selectedLocationIdentifier: defaultSelectedLocationId, // Use a simplified default or re-fetch user logistics
            itemSpecificAddress: '',
            deliveryMethods: ['pickup_only'], // Simplified default
            logisticsNotes: '',
            timingType: 'flexible',
            timingFixedDate: undefined,
        });
      }

      router.push(`/items/${docRef.id}`);

    } catch (error: any) {
      console.error("Item Posting Error:", error);
      toast({ title: "Posting Failed", description: error.message || "Could not post item. Please try again.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const isLoadingAi = isSuggestingCategory || isInferringListingType;
  const isLoadingOverall = isLoadingAi || isSubmitting || authLoading || !currentUser;

  if (authLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Authenticating...</div>;
  }
  if (!currentUser) {
      // This case might be handled by a higher-order component or redirect in a real app
      // For now, prompt to sign in. Could redirect.
      return <div className="flex flex-col justify-center items-center h-64 text-center">
          <p className="text-lg font-semibold mb-4">Please sign in to list an item.</p>
          <Button onClick={() => router.push('/auth/signin')}>Sign In</Button>
        </div>;
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
            Tell us about your item. Logistics fields initialize to your profile defaults or sensible options. Our AI can help with category and listing type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

              <section className="space-y-6">
                <h3 className="font-headline text-xl border-b pb-2 mb-4">Item Details</h3>
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel className="font-headline">Item Title</FormLabel><FormControl><Input placeholder="e.g., Vintage Leather Journal" {...field} disabled={isLoadingOverall} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel className="font-headline">Description</FormLabel><FormControl><Textarea placeholder="Condition, features, etc." className="resize-none" rows={5} {...field} disabled={isLoadingOverall} onBlur={() => { field.onBlur(); if (!form.formState.dirtyFields.category || !form.formState.dirtyFields.listingType) { handleAiSuggestions(); }}} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="listingType" render={({ field }) => (<FormItem className="space-y-3"><FormLabel className="font-headline flex items-center gap-2">Listing Type {isInferringListingType && <Loader2 className="h-4 w-4 animate-spin text-primary" />} {!isInferringListingType && form.formState.dirtyFields.listingType && <Sparkles className="h-4 w-4 text-accent" />}</FormLabel><FormControl><RadioGroup onValueChange={(value) => { field.onChange(value); form.setValue('listingType', value as 'offer' | 'want', {shouldDirty: true}); }} value={field.value} className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4" disabled={isLoadingOverall}><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="offer" id="offer" disabled={isLoadingOverall} /></FormControl><FormLabel htmlFor="offer" className="font-normal flex items-center gap-2"><Gift className="h-5 w-5 text-green-600" /> Offering an item</FormLabel></FormItem><FormItem className="flex items-center space-x-3 space-y-0"><FormControl><RadioGroupItem value="want" id="want" disabled={isLoadingOverall} /></FormControl><FormLabel htmlFor="want" className="font-normal flex items-center gap-2"><Search className="h-5 w-5 text-blue-600" /> Looking for an item</FormLabel></FormItem></RadioGroup></FormControl><FormDescription className="font-body">AI may suggest this.</FormDescription><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel className="font-headline flex items-center gap-2">Category {isSuggestingCategory && !globalSelectedCategory && <Loader2 className="h-4 w-4 animate-spin text-primary" />} {(!isSuggestingCategory || globalSelectedCategory) && (form.formState.dirtyFields.category || globalSelectedCategory) && <Sparkles className="h-4 w-4 text-accent" />}</FormLabel><FormControl><Input placeholder={isSuggestingCategory && !globalSelectedCategory ? "AI suggesting..." : (globalSelectedCategory && !form.formState.dirtyFields.category ? globalSelectedCategory : "e.g., Books")} {...field} onChange={(e) => { field.onChange(e); form.setValue('category', e.target.value, {shouldDirty: true});}} disabled={isLoadingOverall} /></FormControl><FormDescription className="font-body">{globalSelectedCategory && !form.formState.dirtyFields.category ? `Prefilled from global filter. ` : ``}AI may suggest if not globally set. Type to override.</FormDescription><FormMessage /></FormItem>)} />

                <FormItem>
                  <FormLabel className="font-headline">Item Image</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setImageFile(file);
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImagePreview(reader.result as string);
                          }
                          reader.readAsDataURL(file);
                        } else {
                          setImagePreview(null);
                        }
                      }}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      disabled={isLoadingOverall}
                    />
                  </FormControl>
                  {imagePreview && (
                    <div className="mt-4">
                      <img src={imagePreview} alt="Image preview" className="w-full max-w-xs h-auto rounded-md shadow-md mx-auto" />
                    </div>
                  )}
                  <FormDescription className="font-body">Upload an image for your item. Required.</FormDescription>
                  {/* You might want to add a FormMessage here if you make the file input a required field via react-hook-form controller */}
                </FormItem>
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
                        <SelectItem value={NO_LOCATION_SPECIFIED_VALUE}>Location not specified for this item</SelectItem>
                        {currentUser.locations && currentUser.locations.length > 0 && currentUser.locations.map((loc: UserStoredLocation) => (
                          <SelectItem key={loc.id} value={loc.id}>{loc.name} ({loc.address || 'Address not set'})</SelectItem>
                        ))}
                        <SelectItem value={ITEM_SPECIFIC_LOCATION_VALUE}>Enter a specific address for this item</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="font-body">Choose a stored location, enter a new one, or specify none. Optional.</FormDescription>
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
                
                <FormField
                  control={form.control}
                  name="deliveryMethods"
                  render={({ field }) => (
                    <FormItem>
                      <div className="mb-2">
                        <FormLabel className="font-headline flex items-center gap-2"><Truck className="h-5 w-5 text-muted-foreground" />Delivery</FormLabel>
                        <FormDescription className="font-body">Select all that apply. Initializes to your profile defaults.</FormDescription>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {Object.entries(deliveryMethodMapConcrete).map(([key, label]) => (
                          <FormItem key={key} className="flex flex-row items-center space-x-3 space-y-0 p-2 border rounded-md hover:bg-muted/50 transition-colors">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(key as ItemDeliveryMethod)}
                                onCheckedChange={(checked) => {
                                  const currentValues = field.value || [];
                                  let newValues;
                                  if (checked) {
                                    newValues = [...currentValues, key as ItemDeliveryMethod];
                                  } else {
                                    newValues = currentValues.filter(value => value !== key);
                                  }
                                  newValues = [...new Set(newValues)];
                                  field.onChange(newValues);
                                }}
                                disabled={isLoadingOverall}
                                id={`delivery-${key}`}
                              />
                            </FormControl>
                            <FormLabel htmlFor={`delivery-${key}`} className="font-normal text-sm cursor-pointer flex-grow">
                              {label}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField control={form.control} name="timingType" render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-headline flex items-center gap-2"><Clock className="h-5 w-5 text-muted-foreground" />Timing</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === 'flexible') {
                            form.setValue('timingFixedDate', undefined, { shouldValidate: true });
                          }
                        }}
                        value={field.value}
                        className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4"
                        disabled={isLoadingOverall}
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="flexible" id="timing-flexible" disabled={isLoadingOverall} /></FormControl>
                          <FormLabel htmlFor="timing-flexible" className="font-normal">Flexible</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="fixed_date" id="timing-fixed" disabled={isLoadingOverall} /></FormControl>
                          <FormLabel htmlFor="timing-fixed" className="font-normal">Fixed Date</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {timingTypeWatch === 'fixed_date' && (
                  <FormField
                    control={form.control}
                    name="timingFixedDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="font-headline">Fixed Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isLoadingOverall}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarDays className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])} 
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0,0,0,0)) || isLoadingOverall 
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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

              {listingTypeWatch === 'offer' && (
                <FormField
                  control={form.control}
                  name="isGiftItForward"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-muted/30">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoadingOverall}
                          id="isGiftItForward"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel htmlFor="isGiftItForward" className="font-headline flex items-center gap-2">
                          <HeartHandshake className="h-5 w-5 text-pink-500" />Gift It Forward
                        </FormLabel>
                        <FormDescription className="font-body">Offer this item freely, no direct trade expected.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="openToAnyOpportunity"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-muted/30">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoadingOverall}
                        id="openToAnyOpportunity"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel htmlFor="openToAnyOpportunity" className="font-headline flex items-center gap-2">
                        <Network className="h-5 w-5 text-blue-500" />Open to any opportunity
                      </FormLabel>
                      <FormDescription className="font-body">
                        {field.value
                          ? "AI will consider a wider range of matches for this item."
                          : "AI will primarily focus on direct matches based on your listing type."}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoadingOverall}>
                {isLoadingOverall ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isSubmitting ? 'Posting...' : (isSuggestingCategory ? 'Suggesting...' : (isInferringListingType ? 'Inferring...' : (authLoading ? 'Authenticating' : 'Loading...')))}</>) : (`Post ${form.getValues('listingType') === 'offer' ? 'Offer' : 'Want'} Listing`)}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
