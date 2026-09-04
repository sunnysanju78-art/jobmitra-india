const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://websitenew.tgpsc.gov.in";

async function fetchTGPSCJobs() {
    console.log("🌐 TGPSC");
    console.log("🔧 TGPSC: reading latest Direct Recruitment notifications...");

    try {
        const url = `${BASE_URL}/directRecruitment`;

        const response = await axios.get(url, {
            timeout: 30000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36",
                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
        });

        console.log("✅ TGPSC HTTP", response.status);

        const $ = cheerio.load(response.data);

        const jobs = [];
        const seen = new Set();

        $("a[href*='/preview/']").each((i, el) => {
            const title = $(el)
                .text()
                .replace(/\s+/g, " ")
                .trim();

            let href = $(el).attr("href");

            if (!title || !href) return;

            /*
             * Only current/recent recruitment notifications.
             * The TGPSC page also contains many old 2017-2022 records,
             * so we specifically prioritize 2026/2025 recruitment records.
             */

            const isRecent = /\b2026\b|\b2025\b/i.test(title);

            const isRecruitment =
                /recruitment|notification|direct recruitment|group[- ]?[1-4]|assistant|officer|engineer|lecturer|teacher/i.test(
                    title
                );

            // Ignore generic/non-job documents
            const isIgnore =
                /present commission|common mistakes|do's-and-don'ts|general instructions|application for/i.test(
                    title
                );

            if (!isRecent || !isRecruitment || isIgnore) return;

            if (href.startsWith("/")) {
                href = BASE_URL + href;
            } else if (href.startsWith("http://tspsc.gov.in")) {
                href = href.replace(
                    "http://tspsc.gov.in",
                    BASE_URL
                );
            }

            if (seen.has(href)) return;

            seen.add(href);

            jobs.push({
                title,
                state: "Telangana",
                category: "Job",
                source: "TGPSC",
                url: href,
                applyUrl: BASE_URL + "/"
            });
        });

        console.log(
            "📄 TGPSC latest recruitment records parsed:",
            jobs.length
        );

        return jobs;

    } catch (error) {
        console.error(
            "❌ TGPSC fetch error:",
            error.message
        );

        return [];
    }
}


// ================================
// CLEAN TEST
// ================================

(async () => {
    const jobs = await fetchTGPSCJobs();

    console.log("\n================================");
    console.log("🇮🇳 TGPSC CLEAN TEST");
    console.log("================================");

    console.log("TOTAL TGPSC:", jobs.length);

    jobs.forEach((job, index) => {
        console.log(`\n${index + 1}. ${job.title}`);
        console.log("   State:", job.state);
        console.log("   Category:", job.category);
        console.log("   Source:", job.source);
        console.log("   URL:", job.url);
        console.log("   Apply:", job.applyUrl);
    });
})();
module.exports = {
  readTGPSC: fetchTGPSCJobs,
  fetchTGPSCJobs
};
