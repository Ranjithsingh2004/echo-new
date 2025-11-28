import { openai } from '@ai-sdk/openai';
import { generateText } from "ai";
import type { StorageActionWriter } from "convex/server";
import { assert } from "convex-helpers";
import { Id } from "../_generated/dataModel";

const AI_MODELS = {
  image: openai.chat("gpt-4o-mini"),
  pdf:openai.chat("gpt-4o-mini"),
  html:openai.chat("gpt-4o-mini"),
} as const;

const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const SYSTEM_PROMPTS = {
  image: "You turn images into text. If it is a photo of a document, transcribe it. If it is not a document, describe it.",
  pdf: "You transform PDF files into text.",
  html: "You transform content into markdown."
};

export type ExtractTextContentArgs = {
  storageId: Id<"_storage">;
  filename: string;
  bytes?: ArrayBuffer;
  mimeType: string;
};


export async function extractTextContent(
  ctx: { storage: StorageActionWriter },
  args: ExtractTextContentArgs,
): Promise<string> {
  const { storageId, filename, bytes, mimeType } = args;

  const url = await ctx.storage.getUrl(storageId);
    assert(url, "Failed to get storage URL");

    if (SUPPORTED_IMAGE_TYPES.some((type) => type === mimeType)) {
        return extractImageText(url);
    }
    if (mimeType.toLowerCase().includes("pdf")) {
        return extractPdfText(url, mimeType, filename);
        }
    if (mimeType.toLowerCase().includes("text")) {
    return extractTextFileContent(ctx, storageId, bytes, mimeType);
    }

    throw new Error(`Unsupported MIME type: ${mimeType}`);




    };

    async function extractTextFileContent(
  ctx: { storage: StorageActionWriter },
  storageId: Id<"_storage">,
  bytes: ArrayBuffer | undefined,
  mimeType: string
): Promise<string> {
  const arrayBuffer =
    bytes || (await (await ctx.storage.get(storageId))?.arrayBuffer());

  if (!arrayBuffer) {
    throw new Error("Failed to get file content");
  }

  const text = new TextDecoder().decode(arrayBuffer);
 if (mimeType.toLowerCase() !== "text/plain"){
    const result = await generateText({
  model: AI_MODELS.html,
  system: SYSTEM_PROMPTS.html,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text },
        {
          type: "text",
          text: "Extract the text and print it in a markdown format without explaining you'll do so."
        }
      ]
    }
  ]
});

  return result.text;
 }
 return text;

};



async function extractPdfText(
  url: string,
  mimeType: string,
  filename: string,
): Promise<string> {
  try {
    console.log(`[extractPdfText] Starting extraction for ${filename} using GPT-4o (upgraded model for large files)`);

    // For large PDFs, we need to use GPT-4o which supports much larger outputs
    // GPT-4o can handle up to 16K output tokens vs GPT-4o-mini's 16K
    // But more importantly, GPT-4o can process larger input contexts
    const result = await generateText({
      model: openai.chat('gpt-4o'),  // Use full GPT-4o for better extraction
      system: "You are a PDF text extractor. Extract ALL text from the document, preserving structure and paragraphs. Output ONLY the extracted text with no explanations or metadata. Be thorough and extract every page.",
      messages: [
        {
          role: "user",
          content:[
              {type:"file", data: new URL(url), mimeType, filename},
              {
                  type:"text",
                  text:"Extract the complete text content from this entire PDF document. Include every page, every paragraph, every sentence. Preserve the document structure with paragraph breaks. Do not summarize - extract the full text verbatim."
              }
          ]
        }
      ],
      maxTokens: 16000, // Maximum output tokens
    });

    const extractedLength = result.text.length;
    console.log(`[extractPdfText] Extracted ${extractedLength} characters from ${filename}`);

    if (extractedLength < 1000) {
      console.warn(`[extractPdfText] Warning: Only ${extractedLength} characters extracted from ${filename}. File may be scanned/image-based or very large.`);
    }

    return result.text;
  } catch (error) {
    console.error(`[extractPdfText] Error extracting PDF ${filename}:`, error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


    async function extractImageText(url: string): Promise<string> {
  const result = await generateText({
    model: AI_MODELS.image,
    system: SYSTEM_PROMPTS.image,
    messages: [
    {
        role: "user",
        content: [{ type: "image", image: new URL(url) }]
    },
    ],

  });

  return result.text;
}



