
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { PlusCircle, Sparkles, Loader2, Gift, Search, Filter, HeartHandshake } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { suggestCategory, type SuggestCategoryOutput } from '@/ai/flows/suggest-category-flow';
import { inferListingType, type InferListingTypeOutput } from '@/ai/flows/infer-listing-type-flow';
import { useState, useCallback } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { addNewItemToDummyData } from '@/lib/dummy-data'; 
import { dummyUsers } from '@/lib/dummy-data'; 
import { useRouter } from 'next/navigation'; 

const itemFormSchema = z.object({
  name: z.string().min(3, { message: 'Item name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().min(2, { message: 'Category is required and should be at least 2 characters.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')),
  listingType: z.enum(['offer', 'want'], { required_error: "You must select a listing type." }),
  minimumMatchRatingOverride: z.enum(['Low', 'Medium', 'High']).optional()
    .describe("Optional override for the minimum match rating for this specific item."),
  isGiftItForward: z.boolean().optional(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

export default function NewItemPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [isInferringListingType, setIsInferringListingType] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUserId = dummyUsers[0]?.id;
  const currentUserProfileRating = dummyUsers.find(u => u.id === currentUserId)?.minimumMatchRating || 'Low';


  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      imageUrl: '',
      listingType: 'offer',
      minimumMatchRatingOverride: undefined, 
      isGiftItForward: false,
    },
  });

  const listingType = form.watch('listingType');

  const handleAiSuggestions = useCallback(async () => {
    const name = form.getValues('name');
    const description = form.getValues('description');
    console.log('[AI Suggestions] Triggered. Name:', name, 'Description:', description);
    console.log('[AI Suggestions] Dirty fields:', form.formState.dirtyFields);

    if (name.length < 3 || description.length < 10) {
      console.log('[AI Suggestions] Aborted: Name or description too short.');
      return;
    }

    // --- Category Suggestion ---
    if (!form.formState.dirtyFields.category) {
        setIsSuggestingCategory(true);
        console.log('[AI Suggestions] Requesting category suggestion...');
        try {
        const categoryResult: SuggestCategoryOutput = await suggestCategory({ name, description });
        console.log('[AI Suggestions] Category Result:', categoryResult);

        if (categoryResult.errorMessage) {
            toast({
            title: "AI Category Suggestion Failed",
            description: categoryResult.errorMessage,
            variant: "default",
            });
        } else if (categoryResult.suggestedCategory) {
            form.setValue('category', categoryResult.suggestedCategory, { shouldValidate: true });
            toast({
            title: "AI Category Suggested!",
            description: `We've suggested "${categoryResult.suggestedCategory}" for the category.`,
            });
        }
        } catch (error: any) {
        console.error("Error calling suggestCategory flow from client:", error);
        toast({
            title: "AI System Error (Category)",
            description: `Could not connect to category suggestion service. ${error.message || ''}`,
            variant: "destructive",
        });
        } finally {
        setIsSuggestingCategory(false);
        console.log('[AI Suggestions] Finished category suggestion attempt.');
        }
    } else {
        console.log('[AI Suggestions] Skipping category suggestion: field is dirty.');
    }

    // --- Listing Type Inference ---
    if (!form.formState.dirtyFields.listingType) {
        setIsInferringListingType(true);
        console.log('[AI Suggestions] Requesting listing type inference...');
        try {
        const listingTypeResult: InferListingTypeOutput = await inferListingType({ name, description });
        console.log('[AI Suggestions] Listing Type Result:', listingTypeResult);

        if (listingTypeResult.errorMessage) {
            toast({
            title: "AI Listing Type Inference Failed",
            description: listingTypeResult.errorMessage,
            variant: "default",
            });
        } else if (listingTypeResult.inferredListingType) {
            form.setValue('listingType', listingTypeResult.inferredListingType, { shouldValidate: true });
            toast({
            title: "AI Listing Type Inferred!",
            description: `We've inferred this is an "${listingTypeResult.inferredListingType}" listing. You can change it if needed.`,
            });
        }
        } catch (error: any) {
        console.error("Error calling inferListingType flow from client:", error);
        toast({
            title: "AI System Error (Listing Type)",
            description: `Could not connect to listing type inference. ${error.message || ''}`,
            variant: "destructive",
        });
        } finally {
        setIsInferringListingType(false);
        console.log('[AI Suggestions] Finished listing type inference attempt.');
        }
    } else {
        console.log('[AI Suggestions] Skipping listing type inference: field is dirty.');
    }
  }, [form, toast]);


  async function onSubmit(data: ItemFormValues) {
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "Could not identify current user. Please try again.",
        variant: "destructive",
      });
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
        ownerId: currentUserId,
        minimumMatchRatingOverride: data.minimumMatchRatingOverride, 
        isGiftItForward: data.listingType === 'offer' ? data.isGiftItForward : false, 
      };
      const addedItem = addNewItemToDummyData(newItemData);
      
      toast({
        title: `Item ${data.listingType === 'offer' ? 'Listed' : 'Wanted'}!`,
        description: `${data.name} has been successfully posted.`,
      });
      form.reset(); 
      router.push(`/items/${addedItem.id}`); 
    } catch (error: any) {
        console.error("Error submitting new item:", error);
        toast({
            title: "Submission Error",
            description: error.message || "Could not post your item. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const isLoadingAi = isSuggestingCategory || isInferringListingType;
  const isLoadingOverall = isLoadingAi || isSubmitting;

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-2">
            <PlusCircle className="h-8 w-8 text-primary" />
            List an Item
          </CardTitle>
          <CardDescription className="font-body">
            Tell us about your item. Our AI can help suggest a category and whether you're offering or wanting an item.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Vintage Leather Journal or (Want) Fujifilm Camera" {...field} disabled={isLoadingOverall} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us about the item, its condition, and any unique features. If it's a 'want' item, describe what you're looking for."
                        className="resize-none"
                        rows={5}
                        {...field}
                        disabled={isLoadingOverall}
                        onBlur={() => {
                            field.onBlur(); 
                            if (!form.formState.dirtyFields.category || !form.formState.dirtyFields.listingType) {
                                handleAiSuggestions();
                            }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="listingType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-headline flex items-center gap-2">
                      Listing Type
                      {isInferringListingType && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                       {!isInferringListingType && form.formState.dirtyFields.listingType && <Sparkles className="h-4 w-4 text-accent" />}
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                            field.onChange(value);
                            form.setValue('listingType', value as 'offer' | 'want', {shouldDirty: true});
                        }}
                        value={field.value}
                        className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4"
                        disabled={isLoadingOverall}
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="offer" id="offer" disabled={isLoadingOverall} />
                          </FormControl>
                          <FormLabel htmlFor="offer" className="font-normal flex items-center gap-2">
                             <Gift className="h-5 w-5 text-green-600" /> I'm offering an item I have
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="want" id="want" disabled={isLoadingOverall} />
                          </FormControl>
                          <FormLabel htmlFor="want" className="font-normal flex items-center gap-2">
                            <Search className="h-5 w-5 text-blue-600" /> I'm looking for an item I want
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                     <FormDescription className="font-body">
                      AI may suggest this based on your description. You can change it.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline flex items-center gap-2">
                      Category
                      {isSuggestingCategory && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                       {!isSuggestingCategory && form.formState.dirtyFields.category && <Sparkles className="h-4 w-4 text-accent" />}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isSuggestingCategory ? "AI is suggesting a category..." : "e.g., Books & Stationery"}
                        {...field}
                        onChange={(e) => {
                            field.onChange(e);
                            form.setValue('category', e.target.value, {shouldDirty: true});
                        }}
                        disabled={isLoadingOverall} 
                      />
                    </FormControl>
                    <FormDescription className="font-body">
                      AI may suggest a category. Type to override.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Image URL (Optional)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://example.com/image.png" {...field} disabled={isLoadingOverall}/>
                    </FormControl>
                    <FormDescription className="font-body">
                      A direct link to an image of your item. Use placeholder e.g. https://placehold.co/600x400.png. For 'want' items, this could be an image of the desired item.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumMatchRatingOverride"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline flex items-center gap-2">
                      <Filter className="h-5 w-5 text-muted-foreground" />
                      Minimum Match Rating Override (Optional)
                    </FormLabel>
                    <Select 
                        onValueChange={field.onChange}
                        value={field.value} 
                        disabled={isLoadingOverall}
                    >
                      <FormControl>
                        <SelectTrigger disabled={isLoadingOverall}>
                          <SelectValue placeholder="Select rating to override profile default..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="font-body">
                      If selected, this item will require at least this match quality. Otherwise, your profile default of '{currentUserProfileRating}' will be used.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {listingType === 'offer' && (
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
                          <HeartHandshake className="h-5 w-5 text-pink-500" />
                          Gift It Forward
                        </FormLabel>
                        <FormDescription className="font-body">
                          Check this if you&apos;re offering this item freely, without expecting a direct trade in return.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoadingOverall}>
                {isLoadingOverall ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSubmitting ? 'Posting...' : (isSuggestingCategory ? 'Suggesting Category...' : 'Inferring Type...')}
                  </>
                ) : (
                  `Post ${form.getValues('listingType') === 'offer' ? 'Offer' : 'Want'} Listing`
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

