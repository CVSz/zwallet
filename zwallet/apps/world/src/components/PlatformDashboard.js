/**
 * Platform Dashboard Component
 * Author: Antigravity AI
 */

export function renderPlatformDashboard(data) {
  const { components, globalStatus, security, health, metrics } = data;

  const renderAssets = () => `
    <div class="card animate-slide-up" style="animation-delay: 0.1s">
      <h2>Multi-Chain Assets <span class="badge">LIVE</span></h2>
      <div class="asset-list">
        <div class="asset-item">
          <div class="asset-info">
            <span class="asset-icon">💵</span>
            <div>
              <div class="asset-name">ZEA Stablecoin</div>
              <div class="asset-symbol">ERC-20 (6 Decimals)</div>
            </div>
          </div>
          <div class="asset-balance">1,250.00 ZEA</div>
        </div>
        <div class="asset-item">
          <div class="asset-info">
            <span class="asset-icon">💠</span>
            <div>
              <div class="asset-name">ZEAZ Governance</div>
              <div class="asset-symbol">ERC-20 (18 Decimals)</div>
            </div>
          </div>
          <div class="asset-balance">5,000.00 ZEAZ</div>
        </div>
      </div>
    </div>
  `;

  const renderWeb3Status = () => `
    <div class="card animate-slide-up" style="animation-delay: 0.2s">
      <h2>Web3 Connectivity</h2>
      <div class="status-item">
        <div class="status-meta">
          <span class="status-name">EIP-1193 Provider</span>
          <span class="status-time">Injected: window.ethereum</span>
        </div>
        <div class="status-indicator-group">
          <span class="dot success pulse"></span>
          <span class="latency">READY</span>
        </div>
      </div>
      <div class="security-intel" style="margin-top: var(--spacing-md)">
        <div class="intel-header">
          <span class="title">Active DApp Context</span>
        </div>
        <div class="route-meta">
          <span class="version-tag">Origin: world.zeaz.dev</span>
          <button class="text-button" id="web3-connect">Disconnect</button>
        </div>
      </div>
    </div>
  `;

  return `
    <div class="platform-dashboard animate-fade">
      ${renderWeb3Status()}
      ${renderAssets()}
      
      <div class="card animate-slide-up" style="animation-delay: 0.3s">
        <h2>
          <span>🛰️ Platform Control</span>
          <span class="badge ${globalStatus === 'online' ? '' : 'badge-warning'}">${globalStatus.toUpperCase()}</span>
        </h2>
        ${componentList}
      </div>

      ${securityMetrics}

      <div class="dashboard-footer">
        <button id="refresh-health" class="text-button">Force Sync</button>
        <span class="version-tag">v1.1.0-hardened</span>
      </div>
    </section>
  `;
}

// Styles specific to this component (to be added to styles.css or handled via JS)
export const platformDashboardStyles = `
  .platform-dashboard .status-list {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    margin-top: var(--spacing-sm);
  }
  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--color-bg-accent);
    border-radius: var(--radius-md);
    border: 1px solid rgba(255, 255, 255, 0.02);
  }
  .status-meta {
    display: flex;
    flex-direction: column;
  }
  .status-name {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .status-time {
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }
  .status-indicator-group {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
  .latency {
    font-size: 0.75rem;
    font-family: monospace;
    color: var(--color-primary);
  }
  .subtitle {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-sm);
  }
  .text-button {
    background: transparent;
    padding: 0;
    font-size: 0.75rem;
    color: var(--color-primary);
    text-decoration: underline;
  }
  .version-tag {
    font-size: 0.65rem;
    color: var(--color-text-muted);
  }
  .security-intel {
    margin-top: var(--spacing-lg);
    padding: var(--spacing-md);
    background: rgba(99, 102, 241, 0.05);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(99, 102, 241, 0.1);
  }
  .intel-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }
  .intel-header .title {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-primary);
  }
  .intel-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-sm);
  }
  .intel-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--spacing-sm);
    background: var(--color-bg);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
  }
  .intel-card .label {
    font-size: 0.65rem;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }
  .intel-card .value {
    font-size: 1.1rem;
    font-weight: 800;
    font-family: var(--font-mono);
  }
  .dashboard-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: var(--spacing-md);
  }
`;
