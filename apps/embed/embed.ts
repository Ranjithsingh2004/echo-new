import { EMBED_CONFIG } from './config';
import { chatBubbleIcon, closeIcon } from './icons';

 (function() {
  let iframe: HTMLIFrameElement | null = null;
  let container: HTMLDivElement | null = null;
  let button: HTMLButtonElement | null = null;
  let isOpen = false;
  let launcherIconUrl: string | null = null;

  // Get configuration from script tag
  let organizationId: string | null = null;
  let chatbotId: string | null = null;
  let position: 'bottom-right' | 'bottom-left' = EMBED_CONFIG.DEFAULT_POSITION;
  let customPrimaryColor: string = '#3b82f6'; // Store custom color

  // Try to get the current script
  const currentScript = document.currentScript as HTMLScriptElement;
  if (currentScript) {
    organizationId = currentScript.getAttribute('data-organization-id');
    chatbotId = currentScript.getAttribute('data-chatbot-id');
    position = (currentScript.getAttribute('data-position') as 'bottom-right' | 'bottom-left') || EMBED_CONFIG.DEFAULT_POSITION;
    console.log('[Embed] Got attributes from currentScript:', { organizationId, chatbotId, position });
  } else {
    // Fallback: find script tag by src
    const scripts = document.querySelectorAll('script[src*="embed"]');
    const embedScript = Array.from(scripts).find(script =>
      script.hasAttribute('data-organization-id')
    ) as HTMLScriptElement;

    if (embedScript) {
      organizationId = embedScript.getAttribute('data-organization-id');
      chatbotId = embedScript.getAttribute('data-chatbot-id');
      position = (embedScript.getAttribute('data-position') as 'bottom-right' | 'bottom-left') || EMBED_CONFIG.DEFAULT_POSITION;
      console.log('[Embed] Got attributes from fallback script:', { organizationId, chatbotId, position });
    }
  }
  
  // Exit if no organization ID
  if (!organizationId) {
    console.error('Echo Widget: data-organization-id attribute is required');
    return;
  }
  
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', render);
    } else {
      render();
    }
  }
  
  function render() {
    // Create floating action button
    button = document.createElement('button');
    button.id = 'echo-widget-button';
    button.style.cssText = `
      position: fixed;
      ${position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'}
      bottom: 24px;
      width: 56px;
      height: 56px;
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
      transition: all 0.3s ease;
      opacity: 0;
      visibility: hidden;
    `;
    
    button.addEventListener('click', toggleWidget);
    button.addEventListener('mouseenter', () => {
      if (button) button.style.transform = 'scale(1.05)';
    });
    button.addEventListener('mouseleave', () => {
      if (button) button.style.transform = 'scale(1)';
    });
    setIdleButtonIcon();
    
    document.body.appendChild(button);
    
    // Create container (hidden by default)
    container = document.createElement('div');
    container.id = 'echo-widget-container';
    container.style.cssText = `
      position: fixed;
      ${position === 'bottom-right' ? 'right: 24px;' : 'left: 24px;'}
      bottom: 88px;
      width: 418px;
      height: 510px;
      max-width: calc(100vw - 48px);
      max-height: calc(100vh - 120px);
      z-index: 999998;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      display: none;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    `;
    
    // Create iframe
    iframe = document.createElement('iframe');
    iframe.src = buildWidgetUrl();
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;
    // Add permissions for microphone and clipboard
    iframe.allow = 'microphone; clipboard-read; clipboard-write';
    
    container.appendChild(iframe);
    document.body.appendChild(container);
    
    // Handle messages from widget
    window.addEventListener('message', handleMessage);
  }
  
  function buildWidgetUrl(): string {
    const params = new URLSearchParams();
    params.append('organizationId', organizationId!);
    if (chatbotId) {
      params.append('chatbotId', chatbotId);
    }
    // Add cache-busting parameter to force fresh loads during development
    // Remove this in production or use a version number
    params.append('_t', Date.now().toString());
    const url = `${EMBED_CONFIG.WIDGET_URL}?${params.toString()}`;
    console.log('[Embed] Building widget URL:', url);
    return url;
  }
  
  function handleMessage(event: MessageEvent) {
    if (event.origin !== new URL(EMBED_CONFIG.WIDGET_URL).origin) return;

    const { type, payload } = event.data;

    switch (type) {
      case 'close':
        hide();
        break;
      case 'resize':
        if (payload.height && container) {
          container.style.height = `${payload.height}px`;
        }
        if (payload.width && container) {
          container.style.width = `${payload.width}px`;
        }
        break;
      case 'updateAppearance':
        // Update button color if primary color is provided
        if (payload.primaryColor && button) {
          customPrimaryColor = payload.primaryColor; // Store the custom color
          button.style.background = payload.primaryColor;
        }
        if (payload.launcherIconUrl !== undefined) {
          launcherIconUrl = payload.launcherIconUrl;
          if (!isOpen) {
            setIdleButtonIcon();
          }
        }
        // Update container size if size is provided
        if (payload.size && container) {
          const sizes = {
            small: { width: '368px', height: '460px' },
            medium: { width: '418px', height: '510px' },
            large: { width: '468px', height: '560px' },
          };
          const selectedSize = sizes[payload.size as keyof typeof sizes] || sizes.medium;
          container.style.width = selectedSize.width;
          container.style.height = selectedSize.height;
        }
        // Show button now that appearance is loaded
        if (button) {
          button.style.opacity = '1';
          button.style.visibility = 'visible';
        }
        break;
    }
  }
  
  function toggleWidget() {
    if (isOpen) {
      hide();
    } else {
      show();
    }
  }
  
  function show() {
    if (container && button) {
      isOpen = true;
      container.style.display = 'block';
      // Trigger animation
      setTimeout(() => {
        if (container) {
          container.style.opacity = '1';
          container.style.transform = 'translateY(0)';
        }
      }, 10);
      // Change button icon to close
      button.innerHTML = closeIcon;
    }
  }
  
  function hide() {
    if (container && button) {
      isOpen = false;
      container.style.opacity = '0';
      container.style.transform = 'translateY(10px)';
      // Hide after animation
      setTimeout(() => {
        if (container) container.style.display = 'none';
      }, 300);
      // Change button icon back to chat or custom logo
      setIdleButtonIcon();
      button.style.background = customPrimaryColor; // Use stored custom color
    }
  }

  function setIdleButtonIcon() {
    if (!button) {
      return;
    }

    if (launcherIconUrl) {
      button.innerHTML = '';
      const img = document.createElement('img');
      img.src = launcherIconUrl;
      img.alt = 'Open chat';
      img.style.maxWidth = '60%';
      img.style.maxHeight = '60%';
      img.style.objectFit = 'contain';
      button.appendChild(img);
    } else {
      button.innerHTML = chatBubbleIcon;
    }
  }
  
  function destroy() {
    window.removeEventListener('message', handleMessage);
    if (container) {
      container.remove();
      container = null;
      iframe = null;
    }
    if (button) {
      button.remove();
      button = null;
    }
    isOpen = false;
  }
  
  // Function to reinitialize with new config
  function reinit(newConfig: { organizationId?: string; position?: 'bottom-right' | 'bottom-left' }) {
    // Destroy existing widget
    destroy();
    
    // Update config
    if (newConfig.organizationId) {
      organizationId = newConfig.organizationId;
    }
    if (newConfig.position) {
      position = newConfig.position;
    }
    
    // Reinitialize
    init();
  }
  
  // Expose API to global scope
  (window as any).EchoWidget = {
    init: reinit,
    show,
    hide,
    destroy
  };
  
  // Auto-initialize
  init();
})();