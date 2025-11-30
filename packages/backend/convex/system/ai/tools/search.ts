import { openai } from '@ai-sdk/openai';
import { createTool } from "@convex-dev/agent";
import { generateText } from "ai";
import z from "zod";
import { internal } from "../../../_generated/api";
import { supportAgent } from "../agents/supportAgent";
import rag from "../rag";
import { SEARCH_INTERPRETER_PROMPT } from "../constants";
export const search = createTool({
  description: "Search the knowledge base for relevant information to help answer user questions",
  args: z.object({
    query: z
      .string()
      .describe("The search query to find relevant information")
  }),
  handler: async (ctx, args) => {
    if (!ctx.threadId) {
      return "Missing thread ID";
    }

    const conversation = await ctx.runQuery(
  internal.system.conversations.getByThreadId,
  { threadId: ctx.threadId },
);

if (!conversation) {
  return "Conversation not found";
}

const orgId = conversation.organizationId;

console.log("[search] Conversation chatbotId:", conversation.chatbotId);

// Determine which namespace to use based on chatbot's knowledge base
let namespace = orgId; // Default fallback

if (conversation.chatbotId) {
  console.log("[search] Fetching chatbot with _id:", conversation.chatbotId);
  const chatbot = await ctx.runQuery(internal.system.chatbots.getById, {
    id: conversation.chatbotId,
  });

  console.log("[search] Found chatbot:", chatbot ? chatbot.name : "null");

  if (chatbot) {
    console.log("[search] Chatbot knowledgeBaseId:", chatbot.knowledgeBaseId);
    const knowledgeBase = await ctx.runQuery(internal.system.knowledgeBases.getById, {
      id: chatbot.knowledgeBaseId,
    });

    console.log("[search] Found KB:", knowledgeBase ? knowledgeBase.name : "null");

    if (knowledgeBase) {
      namespace = knowledgeBase.ragNamespace;
      console.log("[search] Using KB namespace:", namespace);
    }
  }
} else {
  console.log("[search] No chatbotId, using default orgId namespace:", namespace);
}


const searchResult = await rag.search(ctx, {
  namespace: namespace,
  query: args.query,
  limit: 50, // Comprehensive search for large chunked files
});

console.log(`[search] Found ${searchResult.entries.length} results for query: "${args.query}"`);
console.log(`[search] Result titles:`, searchResult.entries.map(e => e.title).join(", "));

// Check if multiple different documents were found
const uniqueDocuments = new Set(searchResult.entries.map(e => e.metadata?.displayName || e.title).filter(Boolean));
const documentNames = Array.from(uniqueDocuments);

let contextText = "";

if (documentNames.length > 3) {
  // If more than 3 documents, list them and ask user to clarify
  contextText = `Found information in multiple documents: ${documentNames.slice(0, 5).join(", ")}${documentNames.length > 5 ? `, and ${documentNames.length - 5} more` : ""}. 

CRITICAL: Do NOT try to answer. Simply tell the user which documents contain info and ask them to specify which one they want to know about. Keep it to 1-2 sentences.`;
} else if (documentNames.length > 1) {
  // If 2-3 documents, mention them but provide top results
  contextText = `Found information in: ${documentNames.join(", ")}.

Relevant content (may be long, read carefully):
${searchResult.text}

CRITICAL INSTRUCTION: You have lots of context above, but the user wants a SHORT answer (2-3 sentences max). Extract ONLY what directly answers their question. Do NOT copy chunks verbatim. Summarize like a human would explain it to a friend.`;
} else {
  // Single document or same document chunks - provide comprehensive context
  contextText = `Found in ${documentNames[0] || 'knowledge base'}:

${searchResult.text}

CRITICAL INSTRUCTION: The content above may be very long, but you MUST respond in 2-3 sentences maximum. Read everything, understand it, then give a brief, direct answer. Think: "How would I explain this to a friend in one breath?" Do NOT dump the entire content.`;
}


  const response = await generateText({
  messages: [
    {
      role: "system",
      content: SEARCH_INTERPRETER_PROMPT,
    },
    {
      role: "user",
      content: `User asked: "${args.query}"\n\n${contextText}`,
    }
  ],
  model: openai.chat("gpt-4o-mini"),
});

await supportAgent.saveMessage(ctx, {
  threadId: ctx.threadId,
  message: {
    role: "assistant",
    content: response.text,
  },
});

 return response.text;











  },

});



