async function fetchMarkets() {
    const loader = document.getElementById('loader');
    const errorContainer = document.getElementById('error-container');
    const marketsGrid = document.getElementById('markets-grid');
    
    loader.classList.remove('hidden');
    errorContainer.classList.add('hidden');
    marketsGrid.classList.add('hidden');
    
    try {
        const response = await fetch('http://localhost:3001/api/markets');
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // The data might be an array or an object holding the markets
        console.log('Markets data:', data);
        
        let markets = [];
        if (Array.isArray(data)) {
            markets = data;
        } else if (data && data.data && Array.isArray(data.data)) {
            markets = data.data;
        } else if (data && typeof data === 'object') {
            // Check if there are keys that are arrays or just use values
            for (const key in data) {
                if (Array.isArray(data[key])) {
                    markets = data[key];
                    break;
                }
            }
            if (markets.length === 0) {
               markets = data.items || data.markets || [];
            }
        }
        
        renderMarkets(markets);
        
    } catch (error) {
        console.error('Failed to fetch markets:', error);
        loader.classList.add('hidden');
        errorContainer.classList.remove('hidden');
        document.getElementById('error-message').textContent = error.message || "An unknown error occurred.";
    }
}

function renderMarkets(markets) {
    const loader = document.getElementById('loader');
    const marketsGrid = document.getElementById('markets-grid');
    
    marketsGrid.innerHTML = '';
    
    if (!markets || markets.length === 0) {
        marketsGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-secondary); padding: 3rem;">No active markets found currently.</div>`;
        loader.classList.add('hidden');
        marketsGrid.classList.remove('hidden');
        return;
    }
    
    markets.forEach((market, index) => {
        const metadata = market.priceOracleMetadata || {};
        
        const name = market.title || metadata.name || market.name || 'Unknown Market';
        let ticker = 'POLITICS';
        if (market.tokens && market.tokens.yes) ticker = 'YES/NO';
        else if (metadata.ticker) ticker = metadata.ticker;
        
        const fallbackSvg = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%238a2be2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3C/svg%3E";
        const logo = market.logo || market.imageUrl || metadata.logo || fallbackSvg;
        
        const status = market.status ? market.status.toUpperCase() : 'ACTIVE';
        const volume = market.volumeFormatted || (market.volume ? `$${Number(market.volume).toFixed(2)}` : '$0');
        const dateString = market.expirationDate ? new Date(market.expirationDate).toLocaleDateString() : 'N/A';
        const categoriesHTML = (market.categories || ['Politics']).map(c => `<span class="tag">${c}</span>`).join('');
        
        const card = document.createElement('div');
        card.className = 'market-card fade-in';
        card.style.animationDelay = `${index * 0.05}s`;
        card.style.cursor = 'pointer';
        card.onclick = () => {
            localStorage.setItem('currentMarketSlug', market.slug || market.id);
            window.location.href = `/market.html?slug=${market.slug || market.id}`;
        };
        
        card.innerHTML = `
            <div class="card-header">
                <img src="${logo}" alt="${name}" class="market-logo" onerror="this.src='${fallbackSvg}'">
                <div class="market-title">
                    <div class="market-name">${name}</div>
                    <div class="market-ticker">${ticker}</div>
                </div>
            </div>
            
            <div class="card-stats">
                <div class="stat-box">
                    <div class="stat-label">Status</div>
                    <div class="stat-value" style="color: var(--success);">${status}</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Volume</div>
                    <div class="stat-value">${volume}</div>
                </div>
                <div class="stat-box" style="grid-column: span 2;">
                    <div class="stat-label">Expires</div>
                    <div class="stat-value" style="color: var(--accent-secondary);">${dateString}</div>
                </div>
            </div>
            
            <div class="utility-tags">
                ${categoriesHTML}
            </div>
        `;
        
        marketsGrid.appendChild(card);
    });
    
    loader.classList.add('hidden');
    marketsGrid.classList.remove('hidden');
}

// Initial load
document.addEventListener('DOMContentLoaded', fetchMarkets);

window.openPortfolio = async function() {
    const account = localStorage.getItem('connectedWallet');
    if (!account) {
        alert("Please connect your wallet first to view your portfolio.");
        return;
    }
    
    document.getElementById('portfolio-modal').classList.add('active');
    const list = document.getElementById('portfolio-list');
    list.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading portfolio...</div>';
    
    try {
        const res = await fetch(`http://localhost:3001/api/portfolio/${account}`);
        if (!res.ok) throw new Error("Failed to load portfolio");
        const payload = await res.json();
        
        const orders = payload.orders || payload || [];
        const positions = payload.positions || [];
        
        if (orders.length === 0 && positions.length === 0) {
            list.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No orders or active positions found.</div>';
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';

        if (positions.length > 0) {
            html += '<h4 style="color: var(--accent-primary); margin-top: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">Active Yield Positions</h4>';
            positions.forEach(p => {
                const vaultName = p.vault?.name || (p.protocolName ? `${p.protocolName} (${p.asset?.symbol || 'USDC'})` : "Unknown Vault");
                const valUsdRaw = p.valueUsd || p.balanceUsd;
                const valUsd = valUsdRaw ? `$${Number(valUsdRaw).toFixed(2)}` : 'N/A';
                const apy = p.vault && p.vault.analytics?.apy?.total ? `${Number(p.vault.analytics.apy.total).toFixed(2)}%` : 'Active';
                html += `
                <div style="background: rgba(0, 255, 136, 0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(0, 255, 136, 0.2); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: white; font-size: 1.1rem; margin-bottom: 0.3rem;">${vaultName}</div>
                        <div style="color: var(--success); font-size: 0.85rem;">Yielding: ${apy} APY</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: white; font-size: 1.1rem; margin: 0.2rem 0; font-weight: bold;">${valUsd}</div>
                    </div>
                </div>`;
            });
        }
        
        if (orders.length > 0) {
            html += '<h4 style="color: var(--accent-secondary); margin-top: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">Prediction Orders</h4>';
            orders.forEach(o => {
                const date = new Date(o.created_at).toLocaleString();
                html += `
                <div style="background: rgba(255,255,255,0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: white; font-size: 1.1rem; margin-bottom: 0.3rem;">${o.market_slug}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Date: ${date}</div>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Order ID: ${o.order_id}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: ${o.token_type === 'yes' ? 'var(--success)' : 'var(--danger)'}; font-weight: bold; text-transform: uppercase;">${o.token_type}</div>
                        <div style="color: white; font-size: 1.1rem; margin: 0.2rem 0;">${Number(o.size).toLocaleString(undefined, {maximumFractionDigits:2})} Shares</div>
                        <div style="color: var(--accent-secondary); font-size: 0.9rem;">@ $${Number(o.price).toFixed(2)}</div>
                    </div>
                </div>`;
            });
        }
        
        html += '</div>';
        list.innerHTML = html;
        
    } catch (e) {
        console.error(e);
        list.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--danger);">Error: ${e.message}</div>`;
    }
};

window.closePortfolio = function() {
    document.getElementById('portfolio-modal').classList.remove('active');
};
