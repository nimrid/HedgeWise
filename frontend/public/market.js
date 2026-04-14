let currentMarket = null;
let bestVault = null;

async function loadMarketDetails() {
    const params = new URLSearchParams(window.location.search);
    let slug = params.get('slug');
    if (!slug || slug === 'undefined' || slug === 'null') {
        slug = localStorage.getItem('currentMarketSlug');
    }
    if (!slug || slug === 'undefined' || slug === 'null') {
        document.getElementById('error-container').classList.remove('hidden');
        document.getElementById('error-message').textContent = 'No market slug provided in URL.';
        document.getElementById('loader').classList.add('hidden');
        return;
    }

    try {
        const response = await fetch(`http://localhost:3001/api/markets/${slug}`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const market = await response.json();
        renderMarketDetail(market);
    } catch (e) {
        console.error(e);
        document.getElementById('error-container').classList.remove('hidden');
        document.getElementById('error-message').textContent = e.message;
        document.getElementById('loader').classList.add('hidden');
    }
}

function renderMarketDetail(market) {
    currentMarket = market;
    const detailDiv = document.getElementById('market-detail');
    const loader = document.getElementById('loader');
    
    const fallbackSvg = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%238a2be2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3C/svg%3E";
    const logo = market.logo || market.imageUrl || (market.priceOracleMetadata && market.priceOracleMetadata.logo) || fallbackSvg;
    const name = market.title || market.name || 'Unknown Market';
    
    let ticker = 'POLITICS';
    if (market.tokens && market.tokens.yes) ticker = 'YES/NO';
    
    let yesPrice = 0.50;
    let noPrice = 0.50;
    if (market.prices && market.prices.length >= 2) {
        yesPrice = Number(market.prices[0]) || 0.50;
        noPrice = Number(market.prices[1]) || 0.50;
    }
    
    let tradeActionsHTML = '';
    if (market.tokens && market.tokens.yes) {
        tradeActionsHTML = `
        <div class="trading-actions" style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <button class="trade-btn buy-yes" onclick="trade('${market.slug}', 'yes', ${yesPrice})" style="padding: 1.5rem; font-size: 1.2rem;">
                Buy YES @ $${yesPrice.toFixed(2)}
            </button>
            <button class="trade-btn buy-no" onclick="trade('${market.slug}', 'no', ${noPrice})" style="padding: 1.5rem; font-size: 1.2rem;">
                Buy NO @ $${noPrice.toFixed(2)}
            </button>
        </div>
        `;
    }

    const volume = market.volumeFormatted || (market.volume ? `$${Number(market.volume).toFixed(2)}` : '$0');
    const state = market.status ? market.status.toUpperCase() : 'ACTIVE';
    const expires = market.expirationDate ? new Date(market.expirationDate).toLocaleString() : 'N/A';
    
    detailDiv.innerHTML = `
        <div class="card-header" style="flex-direction: column; align-items: center; text-align: center; margin-bottom: 2rem; border-bottom: none;">
            <img src="${logo}" alt="${name}" style="width: 120px; height: 120px; border-radius: 50%; border: 3px solid var(--accent-primary); margin-bottom: 1rem;" onerror="this.src='${fallbackSvg}'">
            <h2 style="font-size: 2.2rem; color: white;">${name}</h2>
            <div class="market-ticker" style="font-size: 1.2rem; margin-top: 0.5rem; justify-content: center;">${ticker}</div>
        </div>
        
        <div class="card-stats" style="grid-template-columns: 1fr 1fr 1fr; margin-bottom: 1rem; gap: 1.5rem; background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 12px;">
            <div class="stat-box">
                <div class="stat-label">Status</div>
                <div class="stat-value" style="color: var(--success); font-size: 1.3rem;">${state}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Volume</div>
                <div class="stat-value" style="font-size: 1.3rem;">${volume}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Expires</div>
                <div class="stat-value" style="color: var(--accent-secondary); font-size: 1.3rem;">${expires}</div>
            </div>
        </div>
        
        ${tradeActionsHTML}
    `;
    
    loader.classList.add('hidden');
    detailDiv.classList.remove('hidden');
    detailDiv.classList.add('fade-in');
}

let activeTradeConfig = null;

window.trade = function(marketSlug, tokenType, price) {
    activeTradeConfig = { marketSlug, tokenType, price };
    
    const usdcInput = document.getElementById('modal-usdc-input');
    usdcInput.value = '';
    
    const title = document.getElementById('modal-title');
    title.textContent = `Buy ${tokenType.toUpperCase()}`;
    title.style.color = tokenType === 'yes' ? 'var(--success)' : 'var(--danger)';
    
    document.getElementById('modal-price-display').textContent = `$${Number(price).toFixed(2)}`;
    document.getElementById('modal-shares-display').textContent = '0';
    document.getElementById('modal-total-display').textContent = '$0.00 USDC';
    
    usdcInput.oninput = (e) => {
        const val = Number(e.target.value);
        if (val > 0) {
            const shares = val / price;
            const totalCost = val;
            const totalPayout = shares * 1.00;
            
            document.getElementById('modal-shares-display').textContent = Math.floor(shares).toLocaleString();
            document.getElementById('modal-total-display').textContent = `$${totalCost.toFixed(2)} USDC`;
            
            const yieldContainer = document.getElementById('projected-yield-container');
            if (bestVault && currentMarket && currentMarket.expirationDate) {
                const expires = new Date(currentMarket.expirationDate).getTime();
                const now = Date.now();
                const durationMs = expires - now;
                
                if (durationMs > 0) {
                    const durationYears = durationMs / (1000 * 60 * 60 * 24 * 365.25);
                    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
                    const apy = bestVault.analytics.apy.total;
                    
                    const projectedYield = totalCost * (apy / 100) * durationYears;
                    const realLoss = totalCost - projectedYield;
                    const bestCase = totalPayout + projectedYield;
                    
                    document.getElementById('modal-projected-yield-display').textContent = `+$${projectedYield.toFixed(2)}`;
                    document.getElementById('modal-worst-case-display').textContent = `-$${realLoss.toFixed(2)}`;
                    document.getElementById('modal-best-case-display').textContent = `$${bestCase.toFixed(2)}`;
                    document.getElementById('modal-apy-display').textContent = typeof apy === 'number' ? apy.toFixed(2) : Number(apy).toFixed(2);
                    document.getElementById('modal-duration-display').textContent = durationDays;
                    
                    if (yieldContainer) yieldContainer.style.display = 'flex';
                } else {
                    if (yieldContainer) yieldContainer.style.display = 'none';
                }
            } else {
                if (yieldContainer) yieldContainer.style.display = 'none';
            }
        } else {
            document.getElementById('modal-shares-display').textContent = '0';
            document.getElementById('modal-total-display').textContent = '$0.00 USDC';
            const yieldContainer = document.getElementById('projected-yield-container');
            if (yieldContainer) yieldContainer.style.display = 'none';
        }
    };
    
    const confirmBtn = document.getElementById('modal-confirm-btn');
    confirmBtn.textContent = 'Confirm Order';
    confirmBtn.disabled = false;
    confirmBtn.style.opacity = '1';
    confirmBtn.style.background = 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))';
    
    document.getElementById('trade-modal').classList.add('active');
};

window.closeTradeModal = function() {
    document.getElementById('trade-modal').classList.remove('active');
    activeTradeConfig = null;
};

window.executeTrade = async function() {
    if (!activeTradeConfig) return;
    if (!bestVault) {
        alert("Yield vault not loaded. Please wait a moment.");
        return;
    }
    
    const usdcInput = document.getElementById('modal-usdc-input');
    const usdcValue = Number(usdcInput.value);
    
    if (isNaN(usdcValue) || usdcValue <= 0) {
        alert("Please enter a valid amount of USDC.");
        return;
    }
    
    const size = Math.floor(usdcValue / activeTradeConfig.price);
    
    const confirmBtn = document.getElementById('modal-confirm-btn');
    confirmBtn.textContent = 'Getting Quote...';
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.7';
    
    try {
        const account = localStorage.getItem('connectedWallet');
        if (!account || !window.ethereum) throw new Error("Wallet not connected");

        // Swap out Limitless for a clean deposit into Li.Fi Earn
        const fromAmountTokens = Math.floor(usdcValue * 1000000).toString();
        const usdcAddressBase = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

        const quoteParams = new URLSearchParams({
            fromChain: String(bestVault.chainId),
            toChain: String(bestVault.chainId),
            fromToken: usdcAddressBase,
            toToken: bestVault.address,
            fromAddress: account,
            toAddress: account,
            fromAmount: fromAmountTokens
        });
        
        const quoteRes = await fetch(`https://li.quest/v1/quote?${quoteParams}`);
        if (!quoteRes.ok) throw new Error("Failed to get quote for vault deposit");
        const quote = await quoteRes.json();

        confirmBtn.textContent = 'Sign Transaction...';
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const network = await provider.getNetwork();
        if (Number(network.chainId) !== 8453) {
            throw new Error('Please switch to Base network in your wallet.');
        }

        const tx = await signer.sendTransaction(quote.transactionRequest);
        confirmBtn.textContent = 'Depositing...';
        
        const receipt = await tx.wait();
        
        // Log "order" into our Supabase Database
        const response = await fetch('http://localhost:3001/api/trade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                marketSlug: activeTradeConfig.marketSlug, 
                tokenType: activeTradeConfig.tokenType, 
                price: activeTradeConfig.price, 
                size,
                walletAddress: account,
                orderId: receipt.hash
            })
        });
        const result = await response.json();
        
        if (result.success) {
            confirmBtn.textContent = 'Success!';
            confirmBtn.style.background = 'var(--success)';
            setTimeout(() => {
                closeTradeModal();
                alert(`Successfully deposited into ${bestVault.name}!\nTx Hash: ${receipt.hash}`);
            }, 800);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error("Trade exception:", error);
        resetConfirmBtn();
        let errMsg = error.message;
        if (error.code === 'ACTION_REJECTED' || (error.info && error.info.error && error.info.error.code === 4001) || error.message.includes('user rejected')) {
            errMsg = "User rejected the transaction.";
        }
        alert(`Request Failed: ${errMsg}`);
    }
    
    function resetConfirmBtn() {
        confirmBtn.textContent = 'Confirm Order';
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.background = 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadMarketDetails();
    loadYieldOpportunities();
});

async function loadYieldOpportunities() {
    const yieldSection = document.getElementById('yield-section');
    const yieldLoader = document.getElementById('yield-loader');
    const yieldContent = document.getElementById('yield-content');
    
    yieldSection.classList.remove('hidden');
    yieldLoader.classList.remove('hidden');
    yieldContent.classList.add('hidden');
    
    try {
        // Step 1: Find best USDC Vaults on Base (increased limit to ensure we find Morpho)
        const params = new URLSearchParams({
            chainId: '8453',
            asset: 'USDC',
            sortBy: 'apy',
            minTvlUsd: '100000',
            limit: '50'
        });
        
        const response = await fetch(`https://earn.li.fi/v1/earn/vaults?${params}`);
        if (!response.ok) throw new Error('Failed to fetch vaults');
        
        const { data: vaults } = await response.json();
        
        // Step 2: Filter for depositable vaults
        const depositableVaults = vaults.filter(v => v.isTransactional);
        if (depositableVaults.length === 0) throw new Error('No depositable vaults found');
        
        // Pick top Morpho vault, fallback to best otherwise
        const morphoVaults = depositableVaults.filter(v => v.protocol && v.protocol.name && v.protocol.name.toLowerCase().includes('morpho'));
        bestVault = morphoVaults.length > 0 ? morphoVaults[0] : depositableVaults[0];
        
        // Render
        const apyTotal = typeof bestVault.analytics.apy.total === 'number' ? bestVault.analytics.apy.total.toFixed(2) : Number(bestVault.analytics.apy.total).toFixed(2);
        const apy30d = typeof bestVault.analytics.apy30d === 'number' ? bestVault.analytics.apy30d.toFixed(2) : Number(bestVault.analytics.apy30d).toFixed(2);
        const fallbackLogo = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300d2ff"%3E%3Cpath d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/%3E%3C/svg%3E';
        const protoLogo = bestVault.protocol.logoURI || fallbackLogo;
        
        yieldContent.innerHTML = `
            <div style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: 12px; margin-bottom: 2rem; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items:center; gap: 1.5rem;">
                <div style="background: rgba(255,255,255,0.05); width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 10px;">
                    <img src="${protoLogo}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                <div style="flex: 1;">
                    <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem; color: white; display: flex; align-items: center; gap: 0.5rem;">
                        ${bestVault.name}
                        <span style="font-size: 0.75rem; background: rgba(0, 255, 136, 0.1); color: var(--success); padding: 0.2rem 0.6rem; border-radius: 30px; border: 1px solid rgba(0, 255, 136, 0.2); font-weight: 500;">Highest Yield</span>
                    </h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 1.5rem; font-size: 0.95rem;">
                        <div style="display: flex; flex-direction: column; gap: 0.2rem;"><span style="color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">Protocol</span> <span style="color: white; font-weight: 500;">${bestVault.protocol.name}</span></div>
                        <div style="display: flex; flex-direction: column; gap: 0.2rem;"><span style="color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">Current APY</span> <span style="color: var(--success); font-weight: 600; text-shadow: 0 0 10px rgba(0,255,136,0.3);">${apyTotal}%</span></div>
                        <div style="display: flex; flex-direction: column; gap: 0.2rem;"><span style="color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">30d Avg APY</span> <span style="color: white; font-weight: 500;">${apy30d}%</span></div>
                        <div style="display: flex; flex-direction: column; gap: 0.2rem;"><span style="color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">TVL</span> <span style="color: white; font-weight: 500;">$${Number(bestVault.analytics.tvl.usd).toLocaleString()}</span></div>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <input type="number" id="yield-amount-input" class="modal-input" placeholder="Amount of USDC to deposit" step="0.01" min="0" style="flex: 1; min-width: 200px;">
                <button id="yield-deposit-btn" onclick="executeYieldDeposit()" class="trade-btn" style="background: linear-gradient(135deg, var(--accent-secondary), #0077ff); color: white; padding: 1rem 2rem; font-size: 1.05rem; min-width: 250px; box-shadow: 0 4px 15px rgba(0, 210, 255, 0.3);">Deposit via Composer</button>
            </div>
            <div id="yield-status" style="margin-top: 1rem; font-size: 0.95rem; color: var(--text-secondary); min-height: 1.5rem;"></div>
        `;
        
        yieldLoader.classList.add('hidden');
        yieldContent.classList.remove('hidden');
        yieldContent.classList.add('fade-in');
        
    } catch (e) {
        console.error("Yield fetch error:", e);
        yieldLoader.classList.add('hidden');
        yieldContent.innerHTML = `<div style="background: rgba(255, 51, 102, 0.1); border: 1px solid rgba(255, 51, 102, 0.3); padding: 1rem; border-radius: 12px; color: var(--danger);">Unable to load yield opportunities: ${e.message}</div>`;
        yieldContent.classList.remove('hidden');
    }
}

async function executeYieldDeposit() {
    if (!bestVault) return;
    if (!window.ethereum) {
        alert("Please connect your Web3 wallet first.");
        return;
    }
    
    // Check local storage or wait for wallet connection
    const account = localStorage.getItem('connectedWallet');
    if (!account) {
        alert("Wallet not connected completely. Please click 'Connect Wallet' at the top right.");
        return;
    }
    
    const amountInput = document.getElementById('yield-amount-input');
    const amountVal = Number(amountInput.value);
    
    if (isNaN(amountVal) || amountVal <= 0) {
        alert("Please enter a valid amount of USDC to deposit.");
        return;
    }
    
    // USDC has 6 decimals on Base
    const fromAmountTokens = Math.floor(amountVal * 1000000).toString();
    const usdcAddressBase = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    
    const statusDiv = document.getElementById('yield-status');
    const btn = document.getElementById('yield-deposit-btn');
    
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.textContent = 'Getting Quote...';
    statusDiv.textContent = '';
    statusDiv.style.color = 'var(--text-secondary)';
    
    try {
        // Step 3: Get Composer Quote
        const quoteParams = new URLSearchParams({
            fromChain: String(bestVault.chainId),
            toChain: String(bestVault.chainId),
            fromToken: usdcAddressBase,
            toToken: bestVault.address, // vault contract triggers Composer deposit
            fromAddress: account,
            toAddress: account,
            fromAmount: fromAmountTokens
        });
        
        const quoteRes = await fetch(`https://li.quest/v1/quote?${quoteParams}`);
        if (!quoteRes.ok) {
            const err = await quoteRes.json();
            throw new Error(err.message || "Failed to get quote");
        }
        const quote = await quoteRes.json();
        
        // Step 4: Execute Transaction
        btn.textContent = 'Sign Transaction...';
        statusDiv.innerHTML = '<span style="color: var(--accent-secondary);">Please confirm the transaction in your wallet...</span>';
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Ensure user is on correct network (Base - 8453)
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== 8453) {
            throw new Error('Please switch to Base network in your wallet to deposit.');
        }

        const tx = await signer.sendTransaction(quote.transactionRequest);
        
        btn.textContent = 'Depositing...';
        statusDiv.innerHTML = `<span style="color: var(--accent-secondary);">Transaction submitted. Hash: <b>${tx.hash.substring(0, 10)}...</b> Please wait for confirmation.</span>`;
        
        const receipt = await tx.wait();
        
        // Success
        btn.style.background = 'var(--success)';
        btn.textContent = 'Deposit Successful!';
        statusDiv.style.color = 'var(--success)';
        statusDiv.innerHTML = `Deposit confirmed in block <b>${receipt.blockNumber}</b>! Your USDC is now earning yield.`;
        amountInput.value = '';
        
        setTimeout(() => {
            btn.style.background = 'linear-gradient(135deg, var(--accent-secondary), #0077ff)';
            btn.textContent = 'Deposit via Composer';
            btn.disabled = false;
            btn.style.opacity = '1';
        }, 5000);
        
    } catch (e) {
        console.error("Deposit error:", e);
        btn.textContent = 'Deposit via Composer';
        btn.style.background = 'linear-gradient(135deg, var(--accent-secondary), #0077ff)';
        btn.disabled = false;
        btn.style.opacity = '1';
        
        statusDiv.style.color = 'var(--danger)';
        let errMsg = e.message;
        if (e.code === 'ACTION_REJECTED' || (e.info && e.info.error && e.info.error.code === 4001) || e.message.includes('user rejected')) {
            errMsg = "User rejected the transaction.";
        }
        statusDiv.textContent = `Deposit failed: ${errMsg}`;
    }
}
