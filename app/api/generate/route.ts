// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateAssignment } from '@/lib/gemini/client';
// ✅ Import from server-db instead of database
import { 
  getUserData, 
  incrementUserTrial,
  saveGeneration,
  getGuestData,
  incrementGuestTrial,
  getRemainingTrials,
  updateUserData
} from '@/lib/firebase/server-db';
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
    const authHeader = request.headers.get('authorization');
    const userId = request.headers.get('x-user-id');
    const guestFingerprint = request.headers.get('x-guest-fingerprint');
    const userApiKeyHeader = request.headers.get('x-user-api-key');

    console.log('🔑 Auth Header:', authHeader ? 'Present' : 'Missing');
    console.log('👤 User ID from header:', userId);
    console.log('👤 Guest Fingerprint:', guestFingerprint);

    let apiKeyToUse: string | undefined;
    let remainingTrials = 5;
    let isPremium = false;
    let userType: 'premium' | 'free' | 'guest' | 'api-key' = 'guest';
    let verifiedUserId: string | null = null;

    // 4. Verify user authentication
    if (userId) {
      const idToken = authHeader?.split('Bearer ')[1];
      
      if (!idToken) {
        console.error('❌ No authorization token provided');
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication required. Please sign out and sign in again.',
            code: 'NO_TOKEN'
          },
          { status: 401 }
        );
      }
      
      // ✅ User is authenticated
      verifiedUserId = userId;
      console.log('✅ User authenticated:', verifiedUserId);
    }

    // 5. Determine which API key to use and check trials
    if (userApiKeyHeader && userApiKeyHeader.length > 10) {
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
      console.log('✅ Using API key from header');
    } else if (verifiedUserId) {
      // ✅ Get user data - DON'T create it here
      const userData = await getUserData(verifiedUserId);
      
      // ✅ If user doesn't exist in DB, return error (AuthContext should have created it)
      if (!userData) {
        console.error('❌ User not found in DB for UID:', verifiedUserId);
        return NextResponse.json(
          { 
            success: false, 
            error: 'User account not fully set up. Please sign out and sign in again.',
            code: 'USER_NOT_IN_DB'
          },
          { status: 404 }
        );
      }

      console.log('✅ User data found in DB:', {
        uid: userData.uid,
        isPremium: userData.isPremium,
        trialsUsed: userData.freeTrialsUsed
      });

      // Check if user has stored their own API key
      if (userData.apiKey) {
        try {
          const decryptedKey = decrypt(userData.apiKey);
          if (decryptedKey && decryptedKey.length > 10) {
            apiKeyToUse = decryptedKey;
            userType = 'api-key';
            remainingTrials = Infinity;
            console.log('✅ Using user\'s own API key');
          }
        } catch (error) {
          console.error('Failed to decrypt API key:', error);
        }
      }

      // If no user API key, use system key
      if (!apiKeyToUse) {
        isPremium = userData.isPremium || false;
        userType = isPremium ? 'premium' : 'free';

        if (isPremium) {
          apiKeyToUse = process.env.GEMINI_API_KEY;
          remainingTrials = Infinity;
          console.log('✅ Premium user - unlimited trials');
        } else {
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
          console.log(`✅ Free user - ${remainingTrials} trials remaining`);
        }
      }
    } else if (guestFingerprint) {
      // Guest user logic
      if (!/^[a-zA-Z0-9_]+$/.test(guestFingerprint)) {
        return NextResponse.json(
          { success: false, error: 'Invalid guest identifier' },
          { status: 400 }
        );
      }
      
      const guestData = await getGuestData(guestFingerprint);
      
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
          remainingTrials = 5;
        }
        apiKeyToUse = process.env.GEMINI_API_KEY;
        console.log(`✅ Guest user - ${remainingTrials} trials remaining`);
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Please sign in or provide a guest identifier' },
        { status: 401 }
      );
    }

    if (!apiKeyToUse) {
      console.error('❌ No API key available');
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    // 6. Validate Gemini API key
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
    }

    // 7. Generate assignment
    console.log('🚀 Generating assignment...');
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

    // 8. Process output image
    let outputImage = generationResult.image;
    let outputImageUrl = generationResult.imageUrl;
    
    if (!outputImage && !outputImageUrl) {
      outputImage = generateFallbackDiagram(generationResult.code, language);
    }

    // 9. Create Word document
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

    // 10. Convert to Base64
    const buffer = await wordBlob.arrayBuffer();
    const base64File = Buffer.from(buffer).toString('base64');

    // 11. Update trial counts
    if (userType !== 'api-key') {
      if (verifiedUserId && !isPremium) {
        await incrementUserTrial(verifiedUserId);
        const updatedRemaining = await getRemainingTrials(verifiedUserId);
        remainingTrials = updatedRemaining;
      } else if (guestFingerprint) {
        await incrementGuestTrial(guestFingerprint);
        const updatedGuestData = await getGuestData(guestFingerprint);
        if (updatedGuestData) {
          remainingTrials = updatedGuestData.maxFreeTrials - updatedGuestData.freeTrialsUsed;
        }
      }
    }

    // 12. Save generation history
    if (verifiedUserId) {
      await saveGeneration(verifiedUserId, {
        prompt,
        language,
        code: generationResult.code,
        outputImageUrl: outputImageUrl || '',
        experimentNumber: expNumber,
        title: docTitle || undefined,
        status: 'completed',
      });
    }

    // 13. Return response
    const fileName = docTitle 
      ? `daaExp${expNumber}_${docTitle.replace(/\s+/g, '_').toLowerCase()}.docx`
      : `daaExp${expNumber}.docx`;

    console.log('✅ Generation complete!');
    
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
    console.error('❌ Error in generate API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred. Please try again.' 
      },
      { status: 500 }
    );
  }
});

// GET endpoint for checking trials
export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const authHeader = request.headers.get('authorization');
    const userId = request.headers.get('x-user-id');
    const guestFingerprint = request.headers.get('x-guest-fingerprint');
    const userApiKey = request.headers.get('x-user-api-key');

    let verifiedUserId: string | null = null;
    if (userId) {
      const idToken = authHeader?.split('Bearer ')[1];
      if (!idToken) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
      verifiedUserId = userId;
    }

    if (userApiKey && userApiKey.length > 10) {
      return NextResponse.json({
        remainingTrials: Infinity,
        isPremium: false,
        maxTrials: Infinity,
        userType: 'api-key',
        hasApiKey: true,
      });
    }

    if (verifiedUserId) {
      const userData = await getUserData(verifiedUserId);
      if (userData) {
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
            console.error('Failed to decrypt API key:', error);
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
      if (!/^[a-zA-Z0-9_]+$/.test(guestFingerprint)) {
        return NextResponse.json(
          { error: 'Invalid guest identifier' },
          { status: 400 }
        );
      }
      
      const guestData = await getGuestData(guestFingerprint);
      if (guestData) {
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
            console.error('Failed to decrypt guest API key:', error);
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