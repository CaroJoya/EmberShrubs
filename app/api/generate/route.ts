// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAssignment } from '@/lib/gemini/client';
import { 
  getUserData, 
  incrementUserTrial,
  saveGeneration,
  getGuestData,
  incrementGuestTrial,
  getRemainingTrials,
  updateUserData
} from '@/lib/firebase/database';
import { 
  createWordDocument
} from '@/lib/docx/generator';
import { 
  generateFallbackDiagram
} from '@/lib/docx/image-utils';
import { encrypt, decrypt } from '@/lib/encryption/encrypt';
import { 
  withRateLimit, 
  sanitizeInput, 
  isValidPrompt, 
  isValidLanguage 
} from '@/lib/rate-limit';

// Validation schema
const generateSchema = z.object({
  prompt: z.string().min(5, 'Prompt must be at least 5 characters').max(500, 'Prompt is too long'),
  language: z.enum(['C', 'Python', 'Java', 'C++']),
  experimentNumber: z.string().optional(),
  title: z.string().optional(),
});

export const POST = withRateLimit(async (request: NextRequest) => {
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

    let { prompt, language, experimentNumber, title } = validationResult.data;
    
    // 2. Sanitize inputs
    prompt = sanitizeInput(prompt);
    if (!isValidPrompt(prompt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid prompt. Must be between 5 and 500 characters.' },
        { status: 400 }
      );
    }
    
    if (!isValidLanguage(language)) {
      return NextResponse.json(
        { success: false, error: 'Invalid language selection.' },
        { status: 400 }
      );
    }
    
    // Sanitize optional fields
    if (title) {
      title = sanitizeInput(title);
      if (title.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Title is too long (max 100 characters).' },
          { status: 400 }
        );
      }
    }
    
    if (experimentNumber) {
      experimentNumber = sanitizeInput(experimentNumber);
      if (!/^[a-zA-Z0-9\s.-]+$/.test(experimentNumber)) {
        return NextResponse.json(
          { success: false, error: 'Invalid experiment number format.' },
          { status: 400 }
        );
      }
    }
    
    // 3. Get user info from headers
    const userId = request.headers.get('x-user-id');
    const guestFingerprint = request.headers.get('x-guest-fingerprint');
    const userApiKeyHeader = request.headers.get('x-user-api-key');

    let apiKeyToUse: string | undefined;
    let remainingTrials = 5;
    let isPremium = false;
    let userType: 'premium' | 'free' | 'guest' | 'api-key' = 'guest';

    // 4. Determine which API key to use and check trials
    // Check for user-provided API key from header first (for guests)
    if (userApiKeyHeader && userApiKeyHeader.length > 10) {
      // Validate the provided API key format
      const sanitizedKey = sanitizeInput(userApiKeyHeader);
      if (sanitizedKey.length < 10) {
        return NextResponse.json(
          { success: false, error: 'Invalid API key format' },
          { status: 400 }
        );
      }
      apiKeyToUse = sanitizedKey;
      userType = 'api-key';
      remainingTrials = Infinity;
    } else if (userId) {
      // Logged in user - check their data
      const userData = await getUserData(userId);
      if (!userData) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if user has stored their own API key
      if (userData.apiKey) {
        try {
          const decryptedKey = decrypt(userData.apiKey);
          if (decryptedKey && decryptedKey.length > 10) {
            apiKeyToUse = decryptedKey;
            userType = 'api-key';
            remainingTrials = Infinity;
          }
        } catch (error) {
          console.error('Failed to decrypt API key:', error);
          // Fall through to normal flow
        }
      }

      // If no user API key, use system key
      if (!apiKeyToUse) {
        isPremium = userData.isPremium || false;
        userType = isPremium ? 'premium' : 'free';

        if (isPremium) {
          apiKeyToUse = process.env.GEMINI_API_KEY;
          remainingTrials = Infinity;
        } else {
          // Free user - check trials
          const usedTrials = userData.freeTrialsUsed || 0;
          const maxTrials = userData.maxFreeTrials || 5;
          remainingTrials = maxTrials - usedTrials;

          if (remainingTrials <= 0) {
            return NextResponse.json(
              { 
                success: false, 
                error: 'No free trials left. Please upgrade to premium or use your own API key.',
                remainingTrials: 0,
                userType: 'free'
              },
              { status: 403 }
            );
          }
          apiKeyToUse = process.env.GEMINI_API_KEY;
        }
      }
    } else if (guestFingerprint) {
      // Validate guest fingerprint
      if (!/^[a-zA-Z0-9_]+$/.test(guestFingerprint)) {
        return NextResponse.json(
          { success: false, error: 'Invalid guest identifier' },
          { status: 400 }
        );
      }
      
      // Guest user - check for stored API key
      const guestData = await getGuestData(guestFingerprint);
      
      // Check if guest has stored API key
      if (guestData?.apiKey) {
        try {
          const decryptedKey = decrypt(guestData.apiKey);
          if (decryptedKey && decryptedKey.length > 10) {
            apiKeyToUse = decryptedKey;
            userType = 'api-key';
            remainingTrials = Infinity;
          }
        } catch (error) {
          console.error('Failed to decrypt guest API key:', error);
        }
      }

      // If no guest API key, use system key with trials
      if (!apiKeyToUse) {
        if (guestData) {
          const usedTrials = guestData.freeTrialsUsed || 0;
          const maxTrials = guestData.maxFreeTrials || 5;
          remainingTrials = maxTrials - usedTrials;

          if (remainingTrials <= 0) {
            return NextResponse.json(
              { 
                success: false, 
                error: 'No free trials left. Please sign in or use your own API key.',
                remainingTrials: 0,
                userType: 'guest'
              },
              { status: 403 }
            );
          }
        } else {
          // New guest - has all 5 trials
          remainingTrials = 5;
        }
        apiKeyToUse = process.env.GEMINI_API_KEY;
      }
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

    // Validate Gemini API key is working (quick check)
    try {
      const testResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKeyToUse}`,
        { method: 'GET' }
      );
      if (!testResponse.ok) {
        return NextResponse.json(
          { success: false, error: 'The provided API key is invalid or expired.' },
          { status: 401 }
        );
      }
    } catch (error) {
      console.error('API key validation error:', error);
      // Continue anyway - the key might still work for generation
    }

    // 5. Generate assignment (code + image)
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

    // 6. Process the output image
    let outputImage = generationResult.image;
    let outputImageUrl = generationResult.imageUrl;
    
    // If no image was generated, create a fallback diagram
    if (!outputImage && !outputImageUrl) {
      outputImage = generateFallbackDiagram(generationResult.code, language);
    }

    // 7. Create Word document
    const expNumber = experimentNumber || '1';
    const docTitle = title || '';

    const docOptions = {
      experimentNumber: expNumber,
      title: docTitle || undefined,
      code: generationResult.code,
      language: language,
      outputImage: outputImage || undefined,
      outputImageUrl: outputImageUrl || undefined,
      includeOutputHeading: true,
    };

    const wordBlob = await createWordDocument(docOptions);

    // 8. Convert to Base64 for response
    const buffer = await wordBlob.arrayBuffer();
    const base64File = Buffer.from(buffer).toString('base64');

    // 9. Update trial counts (only for free users, not API key users)
    if (userType !== 'api-key') {
      if (userId && !isPremium) {
        await incrementUserTrial(userId);
        const updatedRemaining = await getRemainingTrials(userId);
        remainingTrials = updatedRemaining;
      } else if (guestFingerprint) {
        await incrementGuestTrial(guestFingerprint);
        const updatedGuestData = await getGuestData(guestFingerprint);
        if (updatedGuestData) {
          remainingTrials = updatedGuestData.maxFreeTrials - updatedGuestData.freeTrialsUsed;
        }
      }
    }

    // 10. Save generation history (if logged in)
    if (userId) {
      await saveGeneration(userId, {
        prompt,
        language,
        code: generationResult.code,
        outputImageUrl: outputImageUrl || '',
        experimentNumber: expNumber,
        title: docTitle || undefined,
        status: 'completed',
      });
    }

    // 11. Return response with file data
    const fileName = docTitle 
      ? `daaExp${expNumber}_${docTitle.replace(/\s+/g, '_').toLowerCase()}.docx`
      : `daaExp${expNumber}.docx`;

    return NextResponse.json({
      success: true,
      data: {
        code: generationResult.code,
        image: outputImage,
        imageUrl: outputImageUrl,
        experimentNumber: expNumber,
        title: docTitle || '',
        language: language,
        fileData: base64File,
        fileName: fileName,
      },
      remainingTrials: remainingTrials === Infinity ? Infinity : remainingTrials,
      isPremium: isPremium,
      userType: userType,
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
});

/**
 * GET endpoint to check remaining trials
 * Rate limited: 20 requests per minute
 */
export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const userId = request.headers.get('x-user-id');
    const guestFingerprint = request.headers.get('x-guest-fingerprint');
    const userApiKey = request.headers.get('x-user-api-key');

    // If user has their own API key, they have unlimited trials
    if (userApiKey && userApiKey.length > 10) {
      return NextResponse.json({
        remainingTrials: Infinity,
        isPremium: false,
        maxTrials: Infinity,
        userType: 'api-key',
        hasApiKey: true,
      });
    }

    if (userId) {
      const userData = await getUserData(userId);
      if (userData) {
        // Check if user has stored API key
        if (userData.apiKey) {
          try {
            const decryptedKey = decrypt(userData.apiKey);
            if (decryptedKey && decryptedKey.length > 10) {
              return NextResponse.json({
                remainingTrials: Infinity,
                isPremium: userData.isPremium || false,
                maxTrials: Infinity,
                userType: 'api-key',
                hasApiKey: true,
              });
            }
          } catch (error) {
            console.error('Failed to decrypt API key for check:', error);
          }
        }

        if (userData.isPremium) {
          return NextResponse.json({
            remainingTrials: Infinity,
            isPremium: true,
            maxTrials: Infinity,
            userType: 'premium',
            hasApiKey: false,
          });
        }
        return NextResponse.json({
          remainingTrials: userData.maxFreeTrials - userData.freeTrialsUsed,
          isPremium: false,
          maxTrials: userData.maxFreeTrials,
          userType: 'free',
          hasApiKey: false,
        });
      }
    }

    if (guestFingerprint) {
      // Validate guest fingerprint
      if (!/^[a-zA-Z0-9_]+$/.test(guestFingerprint)) {
        return NextResponse.json(
          { error: 'Invalid guest identifier' },
          { status: 400 }
        );
      }
      
      const guestData = await getGuestData(guestFingerprint);
      if (guestData) {
        // Check if guest has stored API key
        if (guestData.apiKey) {
          try {
            const decryptedKey = decrypt(guestData.apiKey);
            if (decryptedKey && decryptedKey.length > 10) {
              return NextResponse.json({
                remainingTrials: Infinity,
                isPremium: false,
                maxTrials: Infinity,
                userType: 'api-key',
                hasApiKey: true,
              });
            }
          } catch (error) {
            console.error('Failed to decrypt guest API key for check:', error);
          }
        }
        return NextResponse.json({
          remainingTrials: guestData.maxFreeTrials - guestData.freeTrialsUsed,
          isPremium: false,
          maxTrials: guestData.maxFreeTrials,
          userType: 'guest',
          hasApiKey: false,
        });
      }
      // New guest
      return NextResponse.json({
        remainingTrials: 5,
        isPremium: false,
        maxTrials: 5,
        userType: 'guest',
        hasApiKey: false,
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
});