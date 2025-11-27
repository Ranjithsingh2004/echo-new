import {
  HTML_SCRIPT,
  type IntegrationId,
  JAVASCRIPT_SCRIPT,
  NEXTJS_SCRIPT,
  REACT_SCRIPT,
} from "./constants";

export const createScript = (
  integrationId: IntegrationId,
  organizationId: string,
  chatbotId?: string,
) => {
  let script = "";

  if (integrationId === "html") {
    script = HTML_SCRIPT;
  } else if (integrationId === "react") {
    script = REACT_SCRIPT;
  } else if (integrationId === "nextjs") {
    script = NEXTJS_SCRIPT;
  } else if (integrationId === "javascript") {
    script = JAVASCRIPT_SCRIPT;
  } else {
    return "";
  }

  // Replace organization ID
  script = script.replace(/{{ORGANIZATION_ID}}/g, organizationId);

  // Handle chatbot ID
  if (chatbotId && chatbotId !== "default") {
    // Replace chatbot ID placeholder with actual ID
    script = script.replace(/{{CHATBOT_ID}}/g, chatbotId);
  } else {
    // Remove chatbot ID lines entirely for default chatbot
    // Remove lines containing data-chatbot-id attribute
    script = script.replace(/\s*data-chatbot-id="{{CHATBOT_ID}}"\n?/g, "");
    // Remove lines mentioning chatbot ID in comments
    script = script.replace(/\n.*chatbotId.*{{CHATBOT_ID}}.*\n/g, "\n");
    // Remove optional comment about chatbot ID
    script = script.replace(/\n<!-- Optional:.*chatbot.*-->\n?/g, "\n");
    script = script.replace(/\n\/\/ Optional:.*chatbot.*\n?/g, "\n");
  }

  return script;
}
