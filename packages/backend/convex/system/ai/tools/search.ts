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
  limit: 5,
});

const contextText = `Found results in ${searchResult.entries
  .map((e) => e.title || null)
  .filter((t) => t !== null)
  .join(", ")}. Here is the context:\n\n${searchResult.text}`;


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



