
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
import { PlusCircle, Sparkles, Loader2, Gift, Search } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { suggestCategory, type SuggestCategoryOutput } from '@/ai/flows/suggest-category-flow';
import { useState, useCallback } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const itemFormSchema = z.object({
  name: z.string().min(3, { message: 'Item name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().min(2, { message: 'Category is required and should be at least 2 characters.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')),
  listingType: z.enum(['offer', 'want'], { required_error: "You must select a listing type." }),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

export default function NewItemPage() {
  const { toast } = useToast();
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      imageUrl: '',
      listingType: 'offer', // Default to 'offer'
    },
  });

  const handleSuggestCategory = useCallback(async () => {
    const name = form.getValues('name');
    const description = form.getValues('description');

    if (name.length >= 3 && description.length >= 10) {
      setIsSuggestingCategory(true);
      form.setValue('category', '');
      try {
        const result: SuggestCategoryOutput = await suggestCategory({ name, description });
        if (result.errorMessage) {
          toast({
            title: "Category Suggestion Error",
            description: result.errorMessage,
            variant: "destructive",
          });
        } else if (result.suggestedCategory) {
          form.setValue('category', result.suggestedCategory, { shouldValidate: true });
          toast({
            title: "Category Suggested!",
            description: `We've suggested "${result.suggestedCategory}" as the category.`,
          });
        } else {
          toast({
            title: "Hmm...",
            description: "Couldn't automatically suggest a category. Please enter one manually if needed, or try rephrasing your description.",
            variant: "default"
          });
        }
      } catch (error) {
        console.error("Error calling suggestCategory flow:", error);
        toast({
          title: "AI System Error",
          description: "Could not connect to the category suggestion service.",
          variant: "destructive",
        });
      } finally {
        setIsSuggestingCategory(false);
      }
    }
  }, [form, toast]);


  function onSubmit(data: ItemFormValues) {
    console.log(data); // Includes listingType
    toast({
      title: `Item ${data.listingType === 'offer' ? 'Listed' : 'Wanted'}!`,
      description: `${data.name} has been successfully posted.`,
    });
    form.reset();
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
            Tell us if you're offering an item you have, or listing an item you want.
            Good descriptions and images attract more attention! Our AI can help suggest a category.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="listingType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="font-headline">What kind of listing is this?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1 md:flex-row md:space-y-0 md:space-x-4"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="offer" id="offer" />
                          </FormControl>
                          <FormLabel htmlFor="offer" className="font-normal flex items-center gap-2">
                             <Gift className="h-5 w-5 text-green-600" /> I'm offering an item I have
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="want" id="want" />
                          </FormControl>
                          <FormLabel htmlFor="want" className="font-normal flex items-center gap-2">
                            <Search className="h-5 w-5 text-blue-600" /> I'm looking for an item I want
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-headline">Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Vintage Leather Journal or (Want) Fujifilm Camera" {...field} />
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
                        onBlur={() => {
                            field.onBlur();
                            handleSuggestCategory();
                        }}
                      />
                    </FormControl>
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
                      {!isSuggestingCategory && form.getValues('category') && <Sparkles className="h-4 w-4 text-accent" />}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isSuggestingCategory ? "AI is suggesting a category..." : "e.g., Books & Stationery"}
                        {...field}
                        readOnly
                      />
                    </FormControl>
                    <FormDescription className="font-body">
                      Category will be suggested by AI based on name and description. You can manually update it if needed.
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
                      <Input type="url" placeholder="https://example.com/image.png" {...field} />
                    </FormControl>
                    <FormDescription className="font-body">
                      A direct link to an image of your item. Use placeholder e.g. https://placehold.co/600x400.png. For 'want' items, this could be an image of the desired item.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isSuggestingCategory}>
                {isSuggestingCategory ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Suggesting Category...
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
