// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAssignment } from '@/lib/gemini/client';
import { 
  getUserData, 
  incrementUserTrial,
  saveGeneration,
  getGuestData,
  incrementGuestTrial
} from '@/lib/firebase/database';
import { 
  createWordDocument
} from '@/lib/docx/generator';
import { 
  processGeminiImageOutput, 
  generateFallbackDiagram
} from '@/lib/docx/image-utils';

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
      const errorMessage = validationResult.error.issues?.[0]?.message || 'Invalid input';
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const { prompt, language, experimentNumber, title } = validationResult.data;
    
    // 2. Get user info from headers
    const userId = request.headers.get('x-user-id');
    const guestFingerprint = request.headers.get('x-guest-fingerprint');
    const userApiKey = request.headers.get('x-user-api-key');

    let apiKeyToUse: string | undefined;
    let remainingTrials = 5;
    let isPremium = false;

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

      isPremium = userData.isPremium || false;

      // Check if premium
      if (isPremium) {
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
      // Guest user - check trials
      const guestData = await getGuestData(guestFingerprint);
      if (guestData) {
        const usedTrials = guestData.freeTrialsUsed || 0;
        const maxTrials = guestData.maxFreeTrials || 5;
        remainingTrials = maxTrials - usedTrials;

        if (remainingTrials <= 0) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'No free trials left. Please sign in or use your own API key.',
              remainingTrials: 0
            },
            { status: 403 }
          );
        }
      }
      apiKeyToUse = process.env.GEMINI_API_KEY;
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

    // 4. Generate assignment (code + image)
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

    // 5. Process the output image
    let outputImage = generationResult.image;
    
    // If no image was generated, create a fallback diagram
    if (!outputImage) {
      outputImage = generateFallbackDiagram(generationResult.code, language);
    } else {
      // Clean up the image text
      outputImage = processGeminiImageOutput(outputImage);
    }

    // 6. Create Word document
    const expNumber = experimentNumber || '1';
    const docTitle = title || '';

    const docOptions = {
      experimentNumber: expNumber,
      title: docTitle || undefined,
      code: generationResult.code,
      language: language,
      outputImage: outputImage,
      includeOutputHeading: true,
    };

    const wordBlob = await createWordDocument(docOptions);

    // 7. Convert to Base64 for response (or return as file download)
    const buffer = await wordBlob.arrayBuffer();
    const base64File = Buffer.from(buffer).toString('base64');

    // 8. Update trial counts (for free users)
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
      await incrementGuestTrial(guestFingerprint);
      // Recalculate remaining trials
      const updatedGuestData = await getGuestData(guestFingerprint);
      if (updatedGuestData) {
        remainingTrials = updatedGuestData.maxFreeTrials - updatedGuestData.freeTrialsUsed;
      }
    }

    // 9. Save generation history (if logged in)
    if (userId) {
      await saveGeneration(userId, {
        prompt,
        language,
        code: generationResult.code,
        outputImageUrl: '', // Not storing images yet
        experimentNumber: expNumber,
        title: docTitle || undefined,
        status: 'completed',
      });
    }

    // 10. Return response with file data
    const fileName = docTitle 
      ? `daaExp${expNumber}_${docTitle.replace(/\s+/g, '_').toLowerCase()}.docx`
      : `daaExp${expNumber}.docx`;

    return NextResponse.json({
      success: true,
      data: {
        code: generationResult.code,
        image: outputImage,
        experimentNumber: expNumber,
        title: docTitle || '',
        language: language,
        fileData: base64File,
        fileName: fileName,
      },
      remainingTrials: remainingTrials,
      isPremium: isPremium,
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

/**
 * GET endpoint to check remaining trials
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const guestFingerprint = request.headers.get('x-guest-fingerprint');

    if (userId) {
      const userData = await getUserData(userId);
      if (userData) {
        return NextResponse.json({
          remainingTrials: userData.maxFreeTrials - userData.freeTrialsUsed,
          isPremium: userData.isPremium || false,
          maxTrials: userData.maxFreeTrials,
        });
      }
    }

    if (guestFingerprint) {
      const guestData = await getGuestData(guestFingerprint);
      if (guestData) {
        return NextResponse.json({
          remainingTrials: guestData.maxFreeTrials - guestData.freeTrialsUsed,
          isPremium: false,
          maxTrials: guestData.maxFreeTrials,
        });
      }
      // New guest
      return NextResponse.json({
        remainingTrials: 5,
        isPremium: false,
        maxTrials: 5,
      });
    }

    return NextResponse.json(
      { error: 'No user identifier provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error checking trials:', error);
    return NextResponse.json(
      { error: 'Failed to check trial status' },
      { status: 500 }
    );
  }
}