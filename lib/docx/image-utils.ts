// lib/docx/image-utils.ts
/**
 * Utilities for handling images in Word documents
 * Note: For now, we use text-based ASCII art instead of actual images
 * This avoids the complexity of downloading and embedding images
 */

/**
 * Process an image URL from Gemini and convert to text description
 * Since we can't easily embed images in the Word document without 
 * downloading and converting, we'll use the text-based output
 */
export const processGeminiImageOutput = (
  imageText: string | null | undefined
): string => {
  if (!imageText) {
    return 'No output image generated.';
  }

  // Clean up the image text
  let cleaned = imageText.trim();

  // If it's empty or just whitespace
  if (cleaned.length < 2) {
    return 'No output image generated.';
  }

  // Remove any markdown code blocks if present
  cleaned = cleaned.replace(/```[\w]*\n?/g, '');
  cleaned = cleaned.replace(/```/g, '');

  // Limit length to avoid huge documents
  if (cleaned.length > 5000) {
    cleaned = cleaned.substring(0, 5000) + '\n\n... (truncated)';
  }

  return cleaned;
};

/**
 * Generate a fallback output diagram based on the code
 * This is used when the Gemini image generation fails or returns nothing
 */
export const generateFallbackDiagram = (
  code: string,
  language: string
): string => {
  // Try to detect what the program does
  const hasLinkedList = /linked.?list|node|struct.*\*.*next|reverse/.test(code);
  const hasStack = /stack|push|pop|LIFO/.test(code);
  const hasQueue = /queue|enqueue|dequeue|FIFO/.test(code);
  const hasTree = /tree|node.*left.*right|bst|binary/.test(code);
  const hasSort = /sort|bubble|quick|merge|insertion|selection/.test(code);
  const hasSearch = /search|find|binary|linear/.test(code);
  const hasGraph = /graph|adjacency|dfs|bfs|dijkstra/.test(code);

  let diagram = '';

  if (hasLinkedList) {
    diagram = `┌─────────────────────────────────────────────────────┐
│  LINKED LIST OPERATION                                    │
│                                                           │
│  Before:  [10] → [20] → [30] → [40] → [50]              │
│                                                           │
│  After:   [50] → [40] → [30] → [20] → [10]              │
│                                                           │
│  Legend:  [ ] = Node    → = Pointer                       │
└─────────────────────────────────────────────────────┘`;
  } else if (hasStack) {
    diagram = `┌─────────────────────────────────────────────────────┐
│  STACK OPERATION (LIFO)                                   │
│                                                           │
│  Top →  [30]                                              │
│         [20]                                              │
│  Bottom→ [10]                                              │
│                                                           │
│  Push(40) → [40]                                          │
│             [30]                                          │
│             [20]                                          │
│             [10]                                          │
│                                                           │
│  Pop() →  [30]                                            │
│           [20]                                            │
│           [10]                                            │
└─────────────────────────────────────────────────────┘`;
  } else if (hasQueue) {
    diagram = `┌─────────────────────────────────────────────────────┐
│  QUEUE OPERATION (FIFO)                                   │
│                                                           │
│  Front → [10] ← Rear                                      │
│          [20]                                             │
│          [30]                                             │
│                                                           │
│  Enqueue(40) → [10] [20] [30] [40]                       │
│                                                           │
│  Dequeue() → [20] [30] [40]                               │
└─────────────────────────────────────────────────────┘`;
  } else if (hasTree) {
    diagram = `┌─────────────────────────────────────────────────────┐
│  BINARY TREE STRUCTURE                                    │
│                                                           │
│              [50]                                          │
│             /    \\                                         │
│          [30]    [70]                                      │
│         /   \\    /   \\                                     │
│      [20]  [40] [60] [80]                                 │
│                                                           │
│  Traversal Order: 50, 30, 20, 40, 70, 60, 80             │
└─────────────────────────────────────────────────────┘`;
  } else if (hasSort) {
    diagram = `┌─────────────────────────────────────────────────────┐
│  SORTING ALGORITHM                                        │
│                                                           │
│  Input:   [64, 25, 12, 22, 11]                           │
│                                                           │
│  Pass 1:  [25, 12, 22, 11, 64]                           │
│  Pass 2:  [12, 22, 11, 25, 64]                           │
│  Pass 3:  [12, 11, 22, 25, 64]                           │
│  Pass 4:  [11, 12, 22, 25, 64]                           │
│                                                           │
│  Output:  [11, 12, 22, 25, 64]  ✅ Sorted                │
└─────────────────────────────────────────────────────┘`;
  } else if (hasSearch) {
    diagram = `┌─────────────────────────────────────────────────────┐
│  SEARCH OPERATION                                         │
│                                                           │
│  Array:  [2, 5, 8, 12, 16, 23, 38, 45, 56]              │
│                                                           │
│  Target: 23                                               │
│                                                           │
│  Binary Search Steps:                                     │
│  Step 1: Check middle → 16 (Too small)                   │
│  Step 2: Check middle → 38 (Too large)                   │
│  Step 3: Check middle → 23 (Found!) ✅                   │
│                                                           │
│  Result: Found at index 5                                 │
└─────────────────────────────────────────────────────┘`;
  } else if (hasGraph) {
    diagram = `┌─────────────────────────────────────────────────────┐
│  GRAPH REPRESENTATION                                     │
│                                                           │
│     A ─── B                                               │
│     │   / │                                               │
│     │ /   │                                               │
│     C ─── D                                               │
│                                                           │
│  Adjacency List:                                          │
│  A: B, C                                                  │
│  B: A, D                                                  │
│  C: A, D                                                  │
│  D: B, C                                                  │
└─────────────────────────────────────────────────────┘`;
  } else {
    // Default generic diagram
    diagram = `┌─────────────────────────────────────────────────────┐
│  PROGRAM OUTPUT                                           │
│                                                           │
│  Language: ${language}                                      │
│  Status: ✅ Program completed successfully                │
│                                                           │
│  ┌───────────────────────────────────────────────────┐    │
│  │  [Sample execution output will appear here]       │    │
│  └───────────────────────────────────────────────────┘    │
│                                                           │
│  Legend:  ✅ Success    ❌ Error    ⚠️ Warning           │
└─────────────────────────────────────────────────────┘`;
  }

  return diagram;
};

/**
 * Determine if we should use a real image or text-based output
 * For MVP, we use text-based output exclusively
 */
export const shouldUseRealImage = (): boolean => {
  // For MVP, always return false to use text-based diagrams
  // In future, we could use this to check if we have image support
  return false;
};