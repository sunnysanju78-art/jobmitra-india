const axios = require("axios");
const cheerio = require("cheerio");

const SOURCES = [
    {
        name: "UPSC",
        url: "https://upsc.gov.in/examinations/active-exams",
        baseUrl: "https://upsc.gov.in"
    },
    {
        name: "SSC",
        url: "https://ssc.gov.in/for-candidates",
        baseUrl: "https://ssc.gov.in"
    },
    {
        name: "RRB",
        url: "https://rrbcdg.gov.in/",
        baseUrl: "https://rrbcdg.gov.in"
    }
];

const HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36",
    "Accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

function clean(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .trim();
}

function absolute(base, href) {
    try {
        return new URL(href, base).href;
    } catch {
        return null;
    }
}

function category(title) {
    const t = title.toLowerCase();

    if (t.includes("admit card") || t.includes("e-admit"))
        return "Admit Card";

    if (
        t.includes("result") ||
        t.includes("marks of") ||
        t.includes("written result") ||
        t.includes("final result")
    )
        return "Result";

    if (
        t.includes("notification") ||
        t.includes("advertisement") ||
        t.includes("addendum") ||
        t.includes("notice")
    )
        return "Notification";

    return "Job";
}

function useful(title) {
    const t = title.toLowerCase();

    const words = [
        "recruitment",
        "examination",
        "vacancy",
        "vacancies",
        "advertisement",
        "notification",
        "admit card",
        "result",
        "civil services",
        "defence",
        "engineering services",
        "medical services",
        "combined",
        "scientist",
        "assistant director",
        "officer",
        "recruitment test",
        "online recruitment",
        "ora",
        "nda",
        "cds",
        "capf",
        "forest service",
        "economic service",
        "statistical service",
        "police",
        "railway",
        "staff selection"
    ];

    return words.some(x => t.includes(x));
}

async function readSource(source, limit) {
    console.log(`\n🌐 ${source.name}`);

    try {
        const response = await axios.get(source.url, {
            timeout: 20000,
            headers: HEADERS,
            maxRedirects: 5
        });

        console.log(`✅ HTTP ${response.status}`);

        if (response.status !== 200)
            return [];

        const $ = cheerio.load(response.data);
        const results = [];
        const seen = new Set();

        $("a").each((i, el) => {
            if (results.length >= limit)
                return false;

            const title = clean($(el).text());
            const href = $(el).attr("href");

            if (!title || !href)
                return;

            if (title.length < 10 || title.length > 300)
                return;

            if (!useful(title))
                return;

            const link = absolute(source.baseUrl, href);

            if (!link)
                return;

            const key = `${source.name}|${title}|${link}`;

            if (seen.has(key))
                return;

            seen.add(key);

            results.push({
                title,
                company:
                    source.name === "UPSC"
                        ? "Union Public Service Commission"
                        : source.name === "SSC"
                        ? "Staff Selection Commission"
                        : "Railway Recruitment Board",
                department:
                    source.name,
                location: "India",
                salary: "See official notification",
                type: "Government",
                qualification: "See official notification",
                vacancies: "See official notification",
                lastDate: "See official notification",
                category: category(title),
                source: source.name,
                sourceUrl: link,
                applyUrl: link,
                externalId:
                    `${source.name}-${Buffer.from(key)
                        .toString("base64")
                        .replace(/[^a-zA-Z0-9]/g, "")
                        .slice(0, 80)}`
            });
        });

        console.log(`📄 Records: ${results.length}`);

        return results;

    } catch (error) {
        console.log(`❌ ${source.name}: ${error.message}`);
        return [];
    }
}

async function fetchJobs(options = {}) {
    const limit = Math.min(
        Number(options.limit) || 200,
        200
    );

    console.log("\n🇮🇳 JOBMITRA INDIA");
    console.log("🏛️ GOVERNMENT JOB ENGINE");
    console.log("🔄 MULTI-SOURCE SCAN");

    let jobs = [];

    for (const source of SOURCES) {
        if (jobs.length >= limit)
            break;

        const remaining = limit - jobs.length;

        const data = await readSource(
            source,
            remaining
        );

        jobs.push(...data);
    }

    const unique = [];
    const ids = new Set();

    for (const job of jobs) {
        if (ids.has(job.externalId))
            continue;

        ids.add(job.externalId);
        unique.push(job);
    }

    const summary = {};

    for (const job of unique) {
        summary[job.category] =
            (summary[job.category] || 0) + 1;
    }

    console.log(
        `\n✅ GOVERNMENT RECORDS: ${unique.length}`
    );

    console.log("📊 SUMMARY:");

    for (const key of Object.keys(summary)) {
        console.log(
            `   ${key}: ${summary[key]}`
        );
    }

    return unique.slice(0, limit);
}

module.exports = {
    fetchJobs
};
