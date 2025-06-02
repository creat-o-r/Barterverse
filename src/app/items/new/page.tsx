
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
import { PlusCircle, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { suggestCategory, type SuggestCategoryOutput } from '@/ai/flows/suggest-category-flow';
import { useState, useCallback } from 'react';

const itemFormSchema = z.object({
  name: z.string().min(3, { message: 'Item name must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  category: z.string().min(2, { message: 'Category is required and should be at least 2 characters.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }).optional().or(z.literal('')),
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
    console.log(data);
    toast({
      title: "Item Listed!",
      description: `${data.name} has been successfully listed for trade.`,
    });
    form.reset(); 
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl flex items-center gap-2">
            <PlusCircle className="h-8 w-8 text-primary" />
            List a New Item for Barter
          </CardTitle>
          <CardDescription className="font-body">
            Provide details about the item you want to trade. Good descriptions and images attract more offers! Our AI will help suggest a category.
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
                      <Input placeholder="e.g., Vintage Leather Journal" {...field} />
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
                        placeholder="Tell us about your item, its condition, and any unique features."
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
                      Category will be suggested by AI based on name and description. You can edit it if needed.
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
                      A direct link to an image of your item. Use placeholder e.g. https://placehold.co/600x400.png
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
                  "List Item"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
