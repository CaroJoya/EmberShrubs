// lib/gemini/client.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// System key (for free trials)
const SYSTEM_API_KEY = process.env.GEMINI_API_KEY || '';

// Safety settings
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Initialize Gemini with system key
const getGeminiClient = (apiKey?: string): GoogleGenerativeAI => {
  const key = apiKey || SYSTEM_API_KEY;
  return new GoogleGenerativeAI(key);
};

// Generate code
export const generateCode = async (prompt: string, language: string, apiKey?: string) => {
  try {
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      safetySettings,
    });

    const systemPrompt = `You are a programming assistant. Generate ONLY the code for the following request. 
    No explanations, no markdown formatting (no \`\`\`), just the raw code.
    Language: ${language}
    
    The user wants: ${prompt}
    
    Return only the code.`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up any markdown formatting
    let code = text;
    // Remove ```language and ``` if present
    code = code.replace(/```[\w]*\n?/g, '');
    // Remove any remaining backticks
    code = code.replace(/`/g, '');
    
    return { code: code.trim(), error: null };
  } catch (error) {
    console.error('Gemini code generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate code';
    return { code: null, error: errorMessage };
  }
};

// Generate output image/diagram
export const generateOutputImage = async (code: string, language: string, prompt: string, apiKey?: string) => {
  try {
    const genAI = getGeminiClient(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      safetySettings,
    });

    // Enhanced prompt for better diagrams
    const systemPrompt = `Generate a simple text-based diagram or output representation for this program.
    
    Language: ${language}
    
    Code:
    ${code.substring(0, 1500)} ${code.length > 1500 ? '... (truncated)' : ''}
    
    Original request: ${prompt}
    
    IMPORTANT: Provide a visual representation of what this program does.
    
    Guidelines:
    1. If it's a data structure (linked list, tree, stack, queue, graph), show a BEFORE and AFTER state.
    2. If it's a sorting algorithm, show the step-by-step sorting process.
    3. If it's a search algorithm, show the search path.
    4. Use ASCII art for diagrams (┌─┐│└┘├┤┴┬┼ characters).
    5. Keep it to 15-25 lines maximum.
    6. If the program has a specific output, show sample data.
    7. For recursive functions, show the recursion tree.
    8. For complex programs, show a simplified flowchart.
    
    Return ONLY the diagram, no explanations.`;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();
    
    return { image: text.trim(), error: null };
  } catch (error) {
    console.error('Gemini image generation error:', error);
    // Don't fail the whole request if image generation fails
    return { image: null, error: null };
  }
};

// Combined generation
export const generateAssignment = async (prompt: string, language: string, apiKey?: string) => {
  // Generate code first
  const codeResult = await generateCode(prompt, language, apiKey);
  if (codeResult.error || !codeResult.code) {
    return { code: null, image: null, imageUrl: null, error: codeResult.error || 'Code generation failed' };
  }

  // Then generate output image
  const imageResult = await generateOutputImage(codeResult.code, language, prompt, apiKey);

  // Check if the image contains a markdown image URL
  let imageUrl: string | null = null;
  let imageText: string | null = imageResult.image;

  if (imageResult.image) {
    // Look for markdown image syntax: ![alt](url)
    const imageMatch = imageResult.image.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    if (imageMatch) {
      imageUrl = imageMatch[1];
      imageText = null; // Clear text since we have an actual image URL
    }
  }

  return {
    code: codeResult.code,
    image: imageText,
    imageUrl: imageUrl,
    error: null,
  };
};

/**
 * Generate only the output image for a given code
 * This is useful for regenerating the output without regenerating the code
 */
export const generateImageOnly = async (code: string, language: string, prompt: string, apiKey?: string) => {
  return await generateOutputImage(code, language, prompt, apiKey);
};