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

// Just provide the search results context directly without document filtering
const contextText = `Search results for "${args.query}":

${searchResult.text}

CRITICAL INSTRUCTION: The content above may be very long and from multiple sources, but you MUST respond in 2-3 sentences maximum. Read everything, understand it, then give a brief, direct answer to the user's question. Think: "How would I explain this to a friend in one breath?" 

Do NOT:
- Ask which document they want
- List document names
- Say "I found information in multiple documents"
- Copy chunks verbatim

DO:
- Give the most relevant answer directly
- Combine info from multiple sources if needed
- Keep it under 3 sentences
- Sound human and helpful

If the answer genuinely isn't in the search results, say: "I don't have info on that. Want me to connect you with our team?"`;



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



