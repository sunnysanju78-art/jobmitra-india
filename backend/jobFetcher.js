const axios = require("axios");
const cheerio = require("cheerio");
const INDIA_SOURCES = require("./india-sources");

const LEGACY_SOURCES = [
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

const SOURCES = [
    ...LEGACY_SOURCES,
    ...INDIA_SOURCES
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


async function readKPSC(limit) {
    const source = SOURCES.find(s => s.name === "KPSC");

    if (!source) {
        console.log("❌ KPSC source not found");
        return [];
    }

    console.log(`\n🌐 KPSC`);
    console.log(`🔧 KPSC: using AJAX notification endpoint...`);

    const https = require("https");

    const endpoint =
        "https://kpsconline.karnataka.gov.in/Notification/Get_Landing_Page_Notification_Details";

    try {
        const response = await axios.get(endpoint, {
            timeout: 30000,
            headers: {
                "User-Agent": HEADERS["User-Agent"],
                "Accept": "text/html, */*",
                "X-Requested-With": "XMLHttpRequest",
                "Referer":
                    "https://kpsconline.karnataka.gov.in/Notification/LandingPageNotificationslistApplicants"
            },
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        });

        console.log(`✅ KPSC AJAX HTTP ${response.status}`);

        const $ = cheerio.load(response.data, { xmlMode: true });
        const results = [];
        const seen = new Set();

        $("tbody tr").each((i, el) => {
            if (results.length >= limit) return false;

            const cells = $(el).find("td");

            if (cells.length < 6) return;

            const title = clean($(cells[0]).text());
            const notificationNo = clean($(cells[1]).text());
            const notificationDate = clean($(cells[2]).text());
            const startDate = clean($(cells[3]).text());
            const lastDate = clean($(cells[4]).text());

            const pdfHref = $(cells[5]).find("a").attr("href");

            if (!title || !notificationNo) return;

            const key = `${title}|${notificationNo}`;

            if (seen.has(key)) return;
            seen.add(key);

            const externalId = `KPSC-${notificationNo}`;

            let applyUrl =
                "https://kpsconline.karnataka.gov.in/Login/Login";

            if (pdfHref) {
                const fullPdf = new URL(
                    pdfHref,
                    "https://kpsconline.karnataka.gov.in"
                ).href;

                results.push({
                    title,
                    company: "Karnataka Public Service Commission",
                    location: "Karnataka",
                    state: "Karnataka",
                    category: "Notification",
                    source: "KPSC",
                    externalId: `KPSC-${notificationNo}`,
                    externalId,
                    notificationNumber: notificationNo,
                    notificationDate,
                    applicationStartDate: startDate,
                    applicationLastDate: lastDate,
                    url: fullPdf,
                    applyUrl
                });
            } else {
                results.push({
                    title,
                    company: "Karnataka Public Service Commission",
                    location: "Karnataka",
                    state: "Karnataka",
                    category: "Notification",
                    source: "KPSC",
                    externalId: `KPSC-${notificationNo}`,
                    externalId,
                    notificationNumber: notificationNo,
                    notificationDate,
                    applicationStartDate: startDate,
                    applicationLastDate: lastDate,
                    url: applyUrl,
                    applyUrl
                });
            }
        });

        console.log(`📄 KPSC notifications parsed: ${results.length}`);
        return results;

    } catch (e) {
        console.log(`❌ KPSC AJAX: ${e.message}`);
        return [];
    }
}

async function readSource(source, limit) {
    console.log(`\n🌐 ${source.name}`);

    try {
        let response;

        try {
            response = await axios.get(source.url, {
                timeout: 20000,
                headers: HEADERS,
                maxRedirects: 5
            });
        } catch (firstError) {

            const sslError =
                String(firstError.message || "").includes("certificate") ||
                String(firstError.message || "").includes("EPROTO") ||
                String(firstError.message || "").includes("SSL");

            if (!sslError) {
                throw firstError;
            }

            console.log(`⚠️ ${source.name}: HTTPS certificate issue`);
            console.log(`🔧 ${source.name}: trying safe fallback...`);

            response = await axios.get(source.url, {
                timeout: 30000,
                headers: HEADERS,
                maxRedirects: 5,
                httpsAgent: new (require("https").Agent)({
                    rejectUnauthorized: false
                })
            });

            console.log(`✅ ${source.name}: fallback connection successful`);
        }

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
                location:
                    source.region ||
                    "India",
                salary: "See official notification",
                type: "Government",
                qualification: (() => {
                    const q = title.match(/(?:for|of)\s+(10th|12th|Intermediate|Diploma|ITI|Graduate|Graduation|Post Graduate|Engineering|B\.Tech|M\.Tech|MBBS|LLB|CA|PhD)/i);
                    return q ? q[1] : "See official notification";
                })(),
                vacancies: (() => {
                    const m = title.match(/(\d+)\s+posts?/i);
                    return m ? m[1] : "See official notification";
                })(),
                lastDate: (() => {
                    const m = title.match(/(?:last date|closing date)[:\s-]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
                    return m ? m[1] : "See official notification";
                })(),
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
    const limit = Math.max(
        Number(options.limit) || 500,
        1
    );

    console.log("\n🇮🇳 JOBMITRA INDIA");
    console.log("🏛️ GOVERNMENT JOB ENGINE");
    console.log("🔄 MULTI-SOURCE SCAN");

    let jobs = [];

    // Scan every source so one source cannot consume the whole limit
    for (const source of SOURCES) {
        console.log(`\n🔎 SCANNING ${source.name}`);

        const data = source.name === "KPSC"
            ? await readKPSC(limit)
            : await readSource(source, limit);

        console.log(`📦 ${source.name} returned: ${data.length}`);

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
    fetchJobs,
    readKPSC
};
