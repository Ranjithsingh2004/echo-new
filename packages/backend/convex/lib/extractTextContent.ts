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
  const apiKey = process.env.LLAMAPARSE_API_KEY;
  const baseUrl = process.env.LLAMAPARSE_BASE_URL || "https://api.cloud.llamaindex.ai";

  if (!apiKey) {
    console.warn(`[extractPdfText] LLAMAPARSE_API_KEY not configured, using fallback`);
    return extractPdfFallback(url, mimeType, filename);
  }

  try {
    console.log(`[extractPdfText] Using LlamaParse for ${filename}`);

    // Step 1: Fetch the PDF from Convex storage
    const pdfResponse = await fetch(url);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.statusText}`);
    }
    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log(`[extractPdfText] Fetched ${pdfBuffer.byteLength} bytes`);

    // Step 2: Upload to LlamaParse using v1 API
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('file', blob, filename);

    const uploadResponse = await fetch(`${baseUrl}/api/v1/parsing/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`LlamaParse upload failed: ${uploadResponse.status} ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const jobId = uploadResult.id;
    console.log(`[extractPdfText] LlamaParse job created: ${jobId}`);

    // Step 3: Poll for completion using v1 API
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes max for large files

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Check every 2 seconds

      // First check job status
      const statusResponse = await fetch(`${baseUrl}/api/v1/parsing/job/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();

        if (statusData.status === 'SUCCESS') {
          // Job complete, fetch the result
          const resultResponse = await fetch(`${baseUrl}/api/v1/parsing/job/${jobId}/result/markdown`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          });

          if (resultResponse.ok) {
            const resultData = await resultResponse.json();
            const text = resultData.markdown || resultData.text || '';
            console.log(`[extractPdfText] Success! Extracted ${text.length} characters from ${filename}`);
            return text;
          }
        } else if (statusData.status === 'ERROR') {
          throw new Error(`LlamaParse processing failed: ${statusData.error || 'Unknown error'}`);
        }
        // Status is PENDING or PROCESSING, continue polling
      }

      attempts++;
      if (attempts % 10 === 0) {
        console.log(`[extractPdfText] Still processing... (${attempts * 2}s elapsed)`);
      }
    }

    throw new Error('LlamaParse timeout after 4 minutes');

  } catch (error) {
    console.error(`[extractPdfText] LlamaParse error:`, error);
    console.log(`[extractPdfText] Falling back to basic extraction`);
    return extractPdfFallback(url, mimeType, filename);
  }
}

// Fallback using GPT-4o-mini (limited but works for small PDFs only)
async function extractPdfFallback(
  url: string,
  mimeType: string,
  filename: string,
): Promise<string> {
  console.log(`[extractPdfFallback] Using GPT-4o-mini for ${filename}`);
  console.warn(`[extractPdfFallback] WARNING: GPT-4o-mini fallback only works for small PDFs (<1MB). Large files will fail.`);

  try {
    const result = await generateText({
      model: AI_MODELS.pdf,
      system: SYSTEM_PROMPTS.pdf,
      messages: [
        {
          role: "user",
          content:[
              {type:"file", data: new URL(url), mimeType, filename},
              {
                  type:"text",
                  text:"Extract ALL text from this PDF."
              }
          ]
        }
      ],
      maxTokens: 16000,
    });

    console.log(`[extractPdfFallback] Extracted ${result.text.length} characters`);
    return result.text;
  } catch (error) {
    console.error(`[extractPdfFallback] Failed to extract PDF:`, error);

    // If it's a memory error, provide helpful error message
    if (error instanceof Error && error.message.includes('out of memory')) {
      throw new Error(`PDF file is too large to process. Please ensure LlamaParse API is properly configured or use a smaller PDF file (<1MB).`);
    }

    throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`);
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



