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

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const network = await provider.getNetwork();
        if (Number(network.chainId) !== 8453) {
            throw new Error('Please switch to Base network in your wallet.');
        }

        if (quote.estimate && quote.estimate.approvalAddress) {
            confirmBtn.textContent = 'Approving USDC...';
            const usdcAbi = [
                "function allowance(address owner, address spender) view returns (uint256)",
                "function approve(address spender, uint256 amount) returns (bool)"
            ];
            const usdcContract = new ethers.Contract(usdcAddressBase, usdcAbi, signer);
            const currentAllowance = await usdcContract.allowance(account, quote.estimate.approvalAddress);
            if (currentAllowance < BigInt(fromAmountTokens)) {
                const approveTx = await usdcContract.approve(quote.estimate.approvalAddress, ethers.MaxUint256);
                await approveTx.wait();
            }
        }

        confirmBtn.textContent = 'Sign Transaction...';
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
    try {
        // Step 1: Find best USDC Vaults on Base
        const params = new URLSearchParams({
            chainId: '8453',
            sortBy: 'apy',
            limit: '5'
        });
        
        const response = await fetch(`https://earn.li.fi/v1/vaults?${params}`, {
            method: 'GET',
            headers: {
                'x-lifi-api-key': '2bdd3fe7-af91-41c6-bb2c-28e063304e01.e09914b8-ab17-4e7c-90d5-2568e9c6f201'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch vaults');
        
        const { data: vaults } = await response.json();
        
        // Step 2: Filter for depositable vaults
        const depositableVaults = vaults.filter(v => v.isTransactional);
        if (depositableVaults.length === 0) throw new Error('No depositable vaults found');
        
        // Pick top Morpho vault, fallback to best otherwise
        const morphoVaults = depositableVaults.filter(v => v.protocol && v.protocol.name && v.protocol.name.toLowerCase().includes('morpho'));
        bestVault = morphoVaults.length > 0 ? morphoVaults[0] : depositableVaults[0];
        
    } catch (e) {
        console.error("Yield fetch error:", e);
    }
}
