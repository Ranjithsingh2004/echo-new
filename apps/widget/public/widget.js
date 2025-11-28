(function(){"use strict";const d={WIDGET_URL:"https://widget.spinabot.com",DEFAULT_POSITION:"bottom-right"},v=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
</svg>`,L=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;(function(){let s=null,t=null,e=null,c=!1,u=null,r=null,l=null,a=d.DEFAULT_POSITION,m="#3b82f6";const h=document.currentScript;if(h)r=h.getAttribute("data-organization-id"),l=h.getAttribute("data-chatbot-id"),a=h.getAttribute("data-position")||d.DEFAULT_POSITION,console.log("[Embed] Got attributes from currentScript:",{organizationId:r,chatbotId:l,position:a});else{const i=document.querySelectorAll('script[src*="embed"]'),n=Array.from(i).find(o=>o.hasAttribute("data-organization-id"));n&&(r=n.getAttribute("data-organization-id"),l=n.getAttribute("data-chatbot-id"),a=n.getAttribute("data-position")||d.DEFAULT_POSITION,console.log("[Embed] Got attributes from fallback script:",{organizationId:r,chatbotId:l,position:a}))}if(!r){console.error("Echo Widget: data-organization-id attribute is required");return}function f(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",b):b()}function b(){e=document.createElement("button"),e.id="echo-widget-button",e.style.cssText=`
      position: fixed;
      ${a==="bottom-right"?"right: 20px;":"left: 20px;"}
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #3b82f6;
      color: white;
      border: none;
      cursor: pointer;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(59, 130, 246, 0.35);
      transition: all 0.2s ease;
    `,e.addEventListener("click",k),e.addEventListener("mouseenter",()=>{e&&(e.style.transform="scale(1.05)")}),e.addEventListener("mouseleave",()=>{e&&(e.style.transform="scale(1)")}),g(),document.body.appendChild(e),t=document.createElement("div"),t.id="echo-widget-container",t.style.cssText=`
      position: fixed;
      ${a==="bottom-right"?"right: 20px;":"left: 20px;"}
      bottom: 90px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 110px);
      z-index: 999998;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      display: none;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    `,s=document.createElement("iframe"),s.src=T(),s.style.cssText=`
      width: 100%;
      height: 100%;
      border: none;
    `,s.allow="microphone; clipboard-read; clipboard-write",t.appendChild(s),document.body.appendChild(t),window.addEventListener("message",x)}function T(){const i=new URLSearchParams;i.append("organizationId",r),l&&i.append("chatbotId",l);const n=`${d.WIDGET_URL}?${i.toString()}`;return console.log("[Embed] Building widget URL:",n),n}function x(i){if(i.origin!==new URL(d.WIDGET_URL).origin)return;const{type:n,payload:o}=i.data;switch(n){case"close":p();break;case"resize":o.height&&t&&(t.style.height=`${o.height}px`),o.width&&t&&(t.style.width=`${o.width}px`);break;case"updateAppearance":if(o.primaryColor&&e&&(m=o.primaryColor,e.style.background=o.primaryColor),o.launcherIconUrl!==void 0&&(u=o.launcherIconUrl,c||g()),o.size&&t){const I={small:{width:"320px",height:"500px"},medium:{width:"380px",height:"600px"},large:{width:"450px",height:"700px"}},E=I[o.size]||I.medium;t.style.width=E.width,t.style.height=E.height}break}}function k(){c?p():w()}function w(){t&&e&&(c=!0,t.style.display="block",setTimeout(()=>{t&&(t.style.opacity="1",t.style.transform="translateY(0)")},10),e.innerHTML=L)}function p(){t&&e&&(c=!1,t.style.opacity="0",t.style.transform="translateY(10px)",setTimeout(()=>{t&&(t.style.display="none")},300),g(),e.style.background=m)}function g(){if(e)if(u){e.innerHTML="";const i=document.createElement("img");i.src=u,i.alt="Open chat",i.style.maxWidth="60%",i.style.maxHeight="60%",i.style.objectFit="contain",e.appendChild(i)}else e.innerHTML=v}function y(){window.removeEventListener("message",x),t&&(t.remove(),t=null,s=null),e&&(e.remove(),e=null),c=!1}function z(i){y(),i.organizationId&&(r=i.organizationId),i.position&&(a=i.position),f()}window.EchoWidget={init:z,show:w,hide:p,destroy:y},f()})()})();
