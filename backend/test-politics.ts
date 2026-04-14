import { Client } from '@limitless-exchange/sdk';

const client = new Client();

async function run() {
    try {
        const page = await client.pages.getMarketPageByPath('/politics');
        console.log("Page ID:", page.id);
        
        const markets = await client.pages.getMarkets(page.id, { limit: 25 });
        console.log("Found Markets:", markets.data.length);
        console.log(markets.data[0].title);
    } catch (e) {
        console.error(e);
    }
}

run();
