/**
 * AI Assistant Component
 * Author: Antigravity AI
 */

export function renderAIAssistant(messages) {
  const messageList = messages.map(msg => `
    <div class="message ${msg.role}">
      <div class="message-bubble">
        ${msg.content}
      </div>
    </div>
  `).join('');

  return `
    <section class="card glass-panel ai-assistant">
      <div class="card-header">
        <h2>
          <span>🧠 Zeaz Intelligence</span>
          <span class="pulse-dot"></span>
        </h2>
        <p class="subtitle">AI-Driven Insights & Risk Analysis</p>
      </div>
      <div class="chat-container" id="chat-scroll">
        ${messageList}
      </div>
      <div class="chat-input-area">
        <input id="ai-input" placeholder="Ask about your wallet or platform security..." />
        <button id="ai-send" class="glow-button">Send</button>
      </div>
    </section>
  `;
}

export const aiAssistantStyles = `
  .ai-assistant {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 400px;
  }
  .chat-container {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-sm) 0;
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }
  .message {
    display: flex;
  }
  .message.user { justify-content: flex-end; }
  .message-bubble {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 18px;
    font-size: 0.9rem;
    line-height: 1.4;
  }
  .message.ai .message-bubble {
    background: var(--color-bg-accent);
    color: var(--color-text-primary);
    border-bottom-left-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .message.user .message-bubble {
    background: var(--color-primary);
    color: white;
    border-bottom-right-radius: 4px;
  }
  .chat-input-area {
    display: flex;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-md);
  }
  .chat-input-area input {
    flex: 1;
  }
  .pulse-dot {
    width: 6px;
    height: 6px;
    background: var(--color-primary);
    border-radius: 50%;
    box-shadow: 0 0 8px var(--color-primary);
    animation: ai-pulse 2s infinite;
  }
  @keyframes ai-pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.5; }
    100% { transform: scale(1); opacity: 1; }
  }
`;
