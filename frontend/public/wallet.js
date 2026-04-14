const BASE_MAINNET_PARAMS = {
    chainId: '0x2105', // 8453
    chainName: 'Base',
    nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18
    },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org']
};

async function initWallet() {
    const btn = document.getElementById('connect-wallet-btn');
    const dot = document.getElementById('wallet-status-dot');
    const text = document.getElementById('wallet-text');
    
    if (!btn) return;
    
    // Explicitly enforce MetaMask only
    let mmProvider = null;
    if (window.ethereum) {
        if (window.ethereum.providers) {
            mmProvider = window.ethereum.providers.find(p => 
                p.isMetaMask && !p.isPhantom && !p.isCoinbaseWallet && !p.isBraveWallet
            );
        } else if (
            window.ethereum.isMetaMask && 
            !window.ethereum.isPhantom && 
            !window.ethereum.isCoinbaseWallet && 
            !window.ethereum.isBraveWallet
        ) {
            mmProvider = window.ethereum;
        }
    }
    
    if (mmProvider) {
        window.ethereum = mmProvider; // Force global provider to strictly use MetaMask
    } else {
        window.ethereum = null; // Deny other wallets
    }
    
    let account = localStorage.getItem('connectedWallet');
    
    if (account && window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                account = accounts[0];
                updateWalletUI(account);
                checkNetwork();
            } else {
                localStorage.removeItem('connectedWallet');
                account = null;
            }
        } catch(e) {
            console.error(e);
        }
    }
    
    btn.addEventListener('click', async () => {
        if (!window.ethereum) {
            alert('Please install MetaMask to connect. Other wallets are currently not supported.');
            return;
        }
        
        try {
            text.textContent = 'Connecting...';
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            
            await checkNetwork(true);
            
            account = accounts[0];
            localStorage.setItem('connectedWallet', account);
            updateWalletUI(account);
            
        } catch (error) {
            console.error(error);
            text.textContent = 'Connect Wallet';
            if (error.code === 4001) {
                console.log('User rejected connection.');
            } else {
                console.error('Wallet connection error:', error);
            }
        }
    });

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
            if (accounts.length === 0) {
                localStorage.removeItem('connectedWallet');
                text.textContent = 'Connect Wallet';
                dot.classList.remove('active');
                btn.classList.remove('connected');
            } else {
                account = accounts[0];
                localStorage.setItem('connectedWallet', account);
                updateWalletUI(account);
                checkNetwork();
            }
        });
        
        window.ethereum.on('chainChanged', () => {
            window.location.reload();
        });
    }

    async function checkNetwork(autoSwitch = false) {
        try {
            const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (currentChainId !== BASE_MAINNET_PARAMS.chainId) {
                if (autoSwitch) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: BASE_MAINNET_PARAMS.chainId }],
                        });
                    } catch (switchError) {
                        if (switchError.code === 4902) {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [BASE_MAINNET_PARAMS],
                            });
                        } else {
                            throw switchError;
                        }
                    }
                } else {
                    text.textContent = 'Wrong Network';
                    dot.style.backgroundColor = 'var(--danger)';
                    dot.style.boxShadow = '0 0 8px var(--danger)';
                }
            } else {
                if (account) {
                    updateWalletUI(account); // Restore normal display if we manually verified chain
                }
            }
        } catch (e) {
             console.error('Failed to check network', e);
        }
    }

    function updateWalletUI(address) {
        const shortAddr = address.substring(0, 6) + '...' + address.substring(address.length - 4);
        text.textContent = shortAddr;
        dot.style.backgroundColor = '';
        dot.style.boxShadow = '';
        dot.classList.add('active');
        btn.classList.add('connected');
    }
}

document.addEventListener('DOMContentLoaded', initWallet);
