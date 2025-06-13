import { NextRequest, NextResponse } from 'next/server';
import { getSmartSuggestion, SmartSuggestionToolInputSchema, SmartSuggestionToolOutput } from '@/ai/flows/smart-suggestion-tool';
// import { auth } from '@/lib/firebase-admin'; // For server-side auth, if using Firebase Admin
// import { getCurrentUser } from '@/utils/serverAuth'; // Example of getting current user

export async function POST(req: NextRequest) {
  try {
    // TODO: Implement proper server-side authentication to get current user's ID
    // For now, we'll rely on the userId passed in the input, assuming it's validated or
    // that the frontend only sends the authenticated user's ID.
    // const currentUser = await getCurrentUser(req);
    // if (!currentUser) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await req.json();

    // Validate input using Zod schema
    const parsedInput = SmartSuggestionToolInputSchema.safeParse(body);
    if (!parsedInput.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsedInput.error.format() }, { status: 400 });
    }

    // Optional: Verify that parsedInput.data.userId matches the authenticated user
    // if (currentUser.uid !== parsedInput.data.userId) {
    //   return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
    // }

    const output: SmartSuggestionToolOutput = await getSmartSuggestion(parsedInput.data);

    return NextResponse.json(output);

  } catch (error: any) {
    console.error('Error in /api/suggest-trade:', error);
    // Check if it's a Genkit specific error structure if needed
    const errorMessage = error.message || 'An unexpected error occurred.';
    const errorDetails = error.details || undefined; // Or error.stack for debugging

    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 });
  }
}
