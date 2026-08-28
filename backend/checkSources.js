const axios = require("axios");
const cheerio = require("cheerio");

async function check(name, url) {
    try {
        const r = await axios.get(url, {
            timeout: 20000,
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        const $ = cheerio.load(r.data);
        let count = 0;

        $("a").each((i, el) => {
            const text = $(el).text().replace(/\s+/g, " ").trim();
            if (text.length >= 10) count++;
        });

        console.log(`✅ ${name}: HTTP ${r.status} | LINKS: ${count}`);
    } catch (e) {
        console.log(`❌ ${name}: ${e.message}`);
    }
}

(async () => {
    await check("SSC", "https://ssc.gov.in/");
    await check("RRB", "https://rrbcdg.gov.in/");
})();
