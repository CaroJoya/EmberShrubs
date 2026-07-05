// lib/docx/generator.ts
import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Packer,
} from 'docx';
import { saveAs } from 'file-saver';

// Types for document generation
export interface WordDocumentOptions {
  experimentNumber: string;
  title?: string;
  code: string;
  language: string;
  outputImage?: string; // ASCII art or text representation
  outputImageUrl?: string; // URL to an actual image (for future use) - kept for future use
  includeOutputHeading?: boolean;
}

/**
 * Generate a Word document in the required format
 * 
 * Format:
 * ═══════════════════════════════════════════════════
 * Experiment No. X
 * [Title - optional]
 * Program:
 * > [Code goes here]
 * OUTPUT:
 * [Image - usually 1, can be multiple if needed]
 * ═══════════════════════════════════════════════════
 */
export const createWordDocument = async (
  options: WordDocumentOptions
): Promise<Blob> => {
  const {
    experimentNumber,
    title,
    code,
    // language is kept in the interface for future use but not destructured
    outputImage,
    includeOutputHeading = true,
  } = options;

  // Clean code - remove any existing backticks or markdown
  const cleanCode = code
    .replace(/```[\w]*\n?/g, '')
    .replace(/`/g, '')
    .trim();

  // Build the document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 1 inch in twips
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          // ---- Experiment No. ----
          new Paragraph({
            children: [
              new TextRun({
                text: `Experiment No. ${experimentNumber}`,
                bold: true,
                size: 28, // 14pt (1pt = 2 half-points)
                font: 'Times New Roman',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 200,
              after: 200,
            },
          }),

          // ---- Title (optional) ----
          ...(title
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: title,
                      size: 24, // 12pt
                      font: 'Times New Roman',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: {
                    before: 100,
                    after: 200,
                  },
                }),
              ]
            : []),

          // ---- Spacer ----
          new Paragraph({
            children: [
              new TextRun({
                text: '',
                size: 12,
              }),
            ],
            spacing: {
              before: 100,
              after: 100,
            },
          }),

          // ---- Program Heading ----
          new Paragraph({
            children: [
              new TextRun({
                text: 'Program:',
                bold: true,
                size: 24, // 12pt
                font: 'Times New Roman',
              }),
            ],
            spacing: {
              before: 200,
              after: 100,
            },
          }),

          // ---- Code Block ----
          ...formatCodeBlock(cleanCode),

          // ---- Spacer ----
          new Paragraph({
            children: [
              new TextRun({
                text: '',
                size: 12,
              }),
            ],
            spacing: {
              before: 100,
              after: 100,
            },
          }),

          // ---- OUTPUT Heading ----
          ...(includeOutputHeading
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'OUTPUT:',
                      bold: true,
                      size: 24, // 12pt
                      font: 'Times New Roman',
                    }),
                  ],
                  spacing: {
                    before: 200,
                    after: 100,
                  },
                }),
              ]
            : []),

          // ---- Output Image / Content ----
          ...(outputImage
            ? [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: outputImage,
                      size: 20, // 10pt
                      font: 'Courier New',
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: {
                    before: 100,
                    after: 200,
                  },
                }),
              ]
            : []),
        ],
      },
    ],
  });

  // Generate the document as a Blob
  return await Packer.toBlob(doc);
};

/**
 * Format code block with > prefix
 * Each line gets a "> " prefix for monospace formatting
 */
const formatCodeBlock = (code: string): Paragraph[] => {
  const lines = code.split('\n');
  const paragraphs: Paragraph[] = [];

  lines.forEach((line) => {
    // Skip empty lines but keep them with just "> " prefix
    const prefix = '>';
    const content = line || '';
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${prefix} ${content}`,
            size: 20, // 10pt
            font: 'Courier New',
            color: '000000',
          }),
        ],
        spacing: {
          before: 20,
          after: 20,
          line: 240, // 1.0 line spacing
        },
        alignment: AlignmentType.LEFT,
      })
    );
  });

  return paragraphs;
};

/**
 * Helper: Create a sample output text for when no image is generated
 */
export const generateSampleOutput = (_language: string, code: string): string => {
  // Try to detect what the program does from the code
  const hasLinkedList = /linked.?list|node|struct.*\*.*next/i.test(code);
  const hasSort = /sort|bubble|quick|merge|insertion/i.test(code);
  const hasSearch = /search|find|binary|linear/i.test(code);
  const hasRecursion = /function.*\(.*\).*\{.*function.*\(/g.test(code) || 
                       /def.*\(.*\).*:.*def.*\(/g.test(code);

  if (hasLinkedList) {
    return `Sample Output (Linked List):
    ┌─────────────────────────────────────┐
    │ Original List: 10 → 20 → 30 → 40    │
    │ After Operation: 40 → 30 → 20 → 10  │
    └─────────────────────────────────────┘`;
  }

  if (hasSort) {
    return `Sample Output (Sorting):
    ┌─────────────────────────────────────┐
    │ Before: [64, 25, 12, 22, 11]        │
    │ After:  [11, 12, 22, 25, 64]        │
    └─────────────────────────────────────┘`;
  }

  if (hasSearch) {
    return `Sample Output (Search):
    ┌─────────────────────────────────────┐
    │ Array: [2, 5, 8, 12, 16, 23, 38]    │
    │ Searching for: 23                    │
    │ Found at index: 5                    │
    └─────────────────────────────────────┘`;
  }

  if (hasRecursion) {
    return `Sample Output (Recursive):
    ┌─────────────────────────────────────┐
    │ Input: n = 5                        │
    │ Output: 120 (5! = 120)              │
    │ Steps: 5→4→3→2→1 → 120             │
    └─────────────────────────────────────┘`;
  }

  // Default sample output
  return `Sample Output:
  ┌─────────────────────────────────────┐
  │ Program executed successfully.      │
  │                                      │
  │ Result: ✅ Completed                │
  └─────────────────────────────────────┘`;
};

/**
 * Download the generated Word document
 */
export const downloadWordDocument = async (
  blob: Blob,
  experimentNumber: string,
  title?: string
): Promise<void> => {
  const fileName = title
    ? `daaExp${experimentNumber}_${title.replace(/\s+/g, '_').toLowerCase()}.docx`
    : `daaExp${experimentNumber}.docx`;
  
  saveAs(blob, fileName);
};

/**
 * Create and download in one call (convenience)
 */
export const generateAndDownloadWord = async (
  options: WordDocumentOptions
): Promise<void> => {
  const blob = await createWordDocument(options);
  await downloadWordDocument(blob, options.experimentNumber, options.title);
};