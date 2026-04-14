async function initWallet() {
    const btn = document.getElementById('connect-wallet-btn');
    const dot = document.getElementById('wallet-status-dot');
    const text = document.getElementById('wallet-text');
    
    if (!btn) return;

    let rpcUrl = 'https://mainnet.base.org';
    try {
        const res = await fetch('http://localhost:3001/api/config');
        if (res.ok) {
            const config = await res.json();
            if (config.BASE_RPC_URL) rpcUrl = config.BASE_RPC_URL;
        }
    } catch(e) {
        console.error('Failed to fetch config', e);
    }

    const BASE_MAINNET_PARAMS = {
        chainId: '0x2105', // 8453
        chainName: 'Base',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
        },
        rpcUrls: [rpcUrl],
        blockExplorerUrls: ['https://basescan.org']
    };
    
    // Fallback to whichever default provider the browser injected natively
    if (window.ethereum && window.ethereum.providers) {
        // Just use the first available if multiple are injected
        window.ethereum = window.ethereum.providers[0] || window.ethereum;
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
