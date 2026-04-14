import { Client } from '@limitless-exchange/sdk';

const client = new Client();

async function run() {
    try {
        const page = await client.pages.getMarketPageByPath('/politics');
        const markets = await client.pages.getMarkets(page.id, { limit: 5 });
        
        markets.data.forEach(m => {
            console.log("Title:", m.title);
            console.log("Tokens:", m.tokens);
            console.log("Prices:", m.prices);
            console.log("---");
        });
    } catch (e) {
        console.error(e);
    }
}

run();
