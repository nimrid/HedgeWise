import express from 'express';
import { Client, OrderClient, Side, OrderType } from '@limitless-exchange/sdk';
import { ethers } from 'ethers';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const client = new Client();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.warn("Supabase credentials not found in environment variables.");
}

let orderClient: OrderClient | null = null;
if (process.env.PRIVATE_KEY) {
    const privateKeyStr = process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : '0x' + process.env.PRIVATE_KEY;
    try {
        orderClient = client.newOrderClient(privateKeyStr);
    } catch (e) {
        console.error("Could not init wallet:", e);
    }
}

app.use(cors());
app.use(express.json());

app.get('/api/markets', async (req, res) => {
    try {
        const page = await client.pages.getMarketPageByPath('/politics');
        const pageResponse = await client.pages.getMarkets(page.id, { limit: 25 });
        res.json(pageResponse.data || []);
    } catch (error) {
        console.error("Error fetching active markets:", error);
        res.status(500).json({ error: String(error) });
    }
});

app.get('/api/markets/:slug', async (req, res) => {
    try {
        const slug = req.params.slug;
        const market = await client.markets.getMarket(slug);
        res.json(market);
    } catch (error) {
        console.error(`Error fetching market ${req.params.slug}:`, error);
        res.status(500).json({ error: String(error) });
    }
});

app.get('/api/portfolio/:wallet', async (req, res) => {
    const wallet = req.params.wallet;
    if (!supabase) {
        return res.status(500).json({ error: "Supabase not configured." });
    }
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('wallet_address', wallet)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (e: any) {
        console.error("Portfolio fetch error:", e);
        res.status(500).json({ error: e.message || String(e) });
    }
});

app.post('/api/trade', async (req, res) => {
    const { marketSlug, tokenType, price, size, walletAddress, orderId } = req.body;
    try {
        if (supabase) {
            try {
                const { error: dbError } = await supabase
                    .from('orders')
                    .insert([
                        {
                            wallet_address: walletAddress || 'Unknown',
                            market_slug: marketSlug,
                            token_type: tokenType,
                            price: price,
                            size: size,
                            order_id: orderId || 'Vault-Deposit'
                        }
                    ]);
                
                if (dbError) {
                    console.error("Supabase Insert error:", dbError);
                }
            } catch (err) {
                console.error("Supabase API error:", err);
            }
        }
        
        res.json({ success: true, orderId: orderId || 'Vault-Deposit' });
    } catch (e: any) {
        console.error("Trade logging error:", e);
        res.status(500).json({ error: e.message || String(e) });
    }
});

app.listen(port, () => {
    console.log(`Backend API listening on http://localhost:${port}`);
});
