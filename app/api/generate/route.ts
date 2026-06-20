// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAssignment } from '@/lib/gemini/client';
import { getUserData, incrementUserTrial } from '@/lib/firebase/database';

// Validation schema
const generateSchema = z.object({
  prompt: z.string().min(5, 'Prompt must be at least 5 characters').max(500, 'Prompt is too long'),
  language: z.enum(['C', 'Python', 'Java', 'C++']),
  experimentNumber: z.string().optional(),
  title: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request
    const body = await request.json();
    const validationResult = generateSchema.safeParse(body);

    if (!validationResult.success) {
      // ✅ FIXED: Properly access ZodError errors
      const errorMessage = validationResult.error.issues?.[0]?.message || 'Invalid input';
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const { prompt, language, experimentNumber, title } = validationResult.data;
    
    // 2. Get user info from headers (sent from client)
    const userId = request.headers.get('x-user-id');
    const guestFingerprint = request.headers.get('x-guest-fingerprint');
    const userApiKey = request.headers.get('x-user-api-key');

    let apiKeyToUse: string | undefined;
    let remainingTrials = 5;

    // 3. Determine which API key to use
    if (userApiKey) {
      // User provided their own API key
      apiKeyToUse = userApiKey;
    } else if (userId) {
      // Logged in user - check their data
      const userData = await getUserData(userId);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if premium
      if (userData.isPremium) {
        apiKeyToUse = process.env.GEMINI_API_KEY;
      } else {
        // Free user - check trials
        const usedTrials = userData.freeTrialsUsed || 0;
        const maxTrials = userData.maxFreeTrials || 5;
        remainingTrials = maxTrials - usedTrials;

        if (remainingTrials <= 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'No free trials left. Please upgrade or use your own API key.',
              remainingTrials: 0
            },
            { status: 403 }
          );
        }
        apiKeyToUse = process.env.GEMINI_API_KEY;
      }
    } else if (guestFingerprint) {
      // Guest user - check trials (simplified for now)
      apiKeyToUse = process.env.GEMINI_API_KEY;
      // We'll implement proper guest tracking in Phase 5
    } else {
      return NextResponse.json(
        { success: false, error: 'Please sign in or provide a guest identifier' },
        { status: 401 }
      );
    }

    if (!apiKeyToUse) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    // 4. Generate assignment
    const generationResult = await generateAssignment(prompt, language, apiKeyToUse);

    if (generationResult.error || !generationResult.code) {
      return NextResponse.json(
        { 
          success: false, 
          error: generationResult.error || 'Failed to generate assignment' 
        },
        { status: 500 }
      );
    }

    // 5. Update trial counts (for free users)
    if (userId && !userApiKey) {
      const userData = await getUserData(userId);
      if (userData && !userData.isPremium) {
        await incrementUserTrial(userId);
        // Recalculate remaining trials
        const updatedUserData = await getUserData(userId);
        if (updatedUserData) {
          remainingTrials = updatedUserData.maxFreeTrials - updatedUserData.freeTrialsUsed;
        }
      }
    } else if (guestFingerprint && !userApiKey) {
      // Update guest trials (Phase 5)
      // await incrementGuestTrial(guestFingerprint);
    }

    // 6. Return response
    return NextResponse.json({
      success: true,
      data: {
        code: generationResult.code,
        image: generationResult.image,
        experimentNumber: experimentNumber || '1',
        title: title || '',
        language: language,
      },
      remainingTrials: remainingTrials,
    });

  } catch (error) {
    console.error('Error in generate API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      },
      { status: 500 }
    );
  }
}