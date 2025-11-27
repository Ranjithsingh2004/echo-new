export const INTEGRATIONS = [
  {
    id: "html",
    title: "HTML",
    icon: "/languages/html5.svg",
  },
  {
    id: "react",
    title: "React",
    icon: "/languages/react.svg",
  },
  {
    id: "nextjs",
    title: "Next.js",
    icon: "/languages/nextjs.svg",
  },
  {
    id: "javascript",
    title: "JavaScript",
    icon: "/languages/javascript.svg",
  },
];

export type IntegrationId = (typeof INTEGRATIONS)[number]["id"];


// Get the embed script URL from environment or use production URL
const EMBED_SCRIPT_URL = process.env.NEXT_PUBLIC_EMBED_URL || "https://widget.spinabot.com/widget.js";

export const HTML_SCRIPT = `<!-- Echo Chat Widget -->
<script
  src="${EMBED_SCRIPT_URL}"
  data-organization-id="{{ORGANIZATION_ID}}"
  data-chatbot-id="{{CHATBOT_ID}}"
  data-position="bottom-right">
</script>

<!-- Optional: data-chatbot-id is optional. If not provided, default chatbot will be used -->`;

export const REACT_SCRIPT = `// Add to your React component or index.html
<script
  src="${EMBED_SCRIPT_URL}"
  data-organization-id="{{ORGANIZATION_ID}}"
  data-chatbot-id="{{CHATBOT_ID}}"
  data-position="bottom-right">
</script>

// Optional: data-chatbot-id is optional. If not provided, default chatbot will be used`;

export const NEXTJS_SCRIPT = `// Add to app/layout.tsx or pages/_document.tsx
<Script
  src="${EMBED_SCRIPT_URL}"
  data-organization-id="{{ORGANIZATION_ID}}"
  data-chatbot-id="{{CHATBOT_ID}}"
  data-position="bottom-right"
  strategy="lazyOnload"
/>

// Don't forget to import Script:
// import Script from 'next/script'
// Optional: data-chatbot-id is optional. If not provided, default chatbot will be used`;

export const JAVASCRIPT_SCRIPT = `// Add this script tag to your HTML
const script = document.createElement('script');
script.src = '${EMBED_SCRIPT_URL}';
script.setAttribute('data-organization-id', '{{ORGANIZATION_ID}}');
script.setAttribute('data-chatbot-id', '{{CHATBOT_ID}}'); // Optional
script.setAttribute('data-position', 'bottom-right');
document.body.appendChild(script);

// Optional: data-chatbot-id is optional. If not provided, default chatbot will be used`;


