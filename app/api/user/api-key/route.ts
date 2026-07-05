// app/api/user/api-key/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserData, updateUserData } from '@/lib/firebase/database';
import { encrypt, decrypt } from '@/lib/encryption/encrypt';
import { withRateLimit, sanitizeInput, isValidLanguage } from '@/lib/rate-limit';

const apiKeySchema = z.object({
  apiKey: z.string().min(10, 'API key must be at least 10 characters'),
});

/**
 * POST - Save user's API key
 * Rate limited: 5 requests per minute
 */
export const POST = withRateLimit(async (request: NextRequest) => {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = apiKeySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: validationResult.error.issues[0]?.message || 'Invalid API key' },
        { status: 400 }
      );
    }

    const { apiKey } = validationResult.data;

    // Sanitize the API key (remove any whitespace)
    const sanitizedKey = sanitizeInput(apiKey);
    if (sanitizedKey.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key format' },
        { status: 400 }
      );
    }

    // Verify the API key is valid
    const isValid = await testGeminiApiKey(sanitizedKey);
    if (!isValid) {
      // Track failed attempt
      const { trackFailedRequest } = await import('@/lib/rate-limit');
      trackFailedRequest(request);
      
      return NextResponse.json(
        { success: false, error: 'Invalid Gemini API key. Please check and try again.' },
        { status: 400 }
      );
    }

    // Encrypt the API key before storing
    const encryptedKey = encrypt(sanitizedKey);

    // Save to Firebase
    const result = await updateUserData(userId, {
      apiKey: encryptedKey,
      apiKeyProvider: 'gemini',
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to save API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key saved successfully',
    });

  } catch (error) {
    console.error('Error saving API key:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
});

/**
 * DELETE - Remove user's API key
 */
export const DELETE = withRateLimit(async (request: NextRequest) => {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const result = await updateUserData(userId, {
      apiKey: null,
      apiKeyProvider: null,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to remove API key' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'API key removed successfully',
    });

  } catch (error) {
    console.error('Error removing API key:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
});

/**
 * GET - Check if user has an API key
 */
export const GET = withRateLimit(async (request: NextRequest) => {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID required' },
        { status: 401 }
      );
    }

    const userData = await getUserData(userId);
    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const hasApiKey = !!userData.apiKey;
    let isValid = false;

    if (hasApiKey && userData.apiKey) {
      try {
        const decryptedKey = decrypt(userData.apiKey);
        isValid = decryptedKey.length > 10;
      } catch (error) {
        console.error('Error decrypting API key:', error);
        isValid = false;
      }
    }

    return NextResponse.json({
      success: true,
      hasApiKey,
      isValid,
    });

  } catch (error) {
    console.error('Error checking API key:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
});

/**
 * Test if a Gemini API key is valid
 */
async function testGeminiApiKey(apiKey: string): Promise<boolean> {
  try {
    // Add a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { 
        method: 'GET',
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Error testing API key:', error);
    return false;
  }
}