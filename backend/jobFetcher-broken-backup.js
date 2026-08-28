const axios = require("axios");
const cheerio = require("cheerio");

// ==========================================
// JOBMITRA INDIA 🇮🇳
// REAL GOVERNMENT JOB ENGINE
// Official Government Sources
// ==========================================

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

// ==========================================
// CLEAN TEXT
// ==========================================

function cleanText(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .replace(/&nbsp;/gi, " ")
        .trim();
}

// ==========================================
// ABSOLUTE URL
// ==========================================

function absoluteUrl(baseUrl, href) {
    try {
        if (!href) return null;

        if (href.startsWith("http://") || href.startsWith("https://")) {
            return href;
        }

        return new URL(href, baseUrl).href;
    } catch {
        return null;
    }
}

// ==========================================
// CHECK IF TEXT LOOKS LIKE GOVERNMENT RECORD
// ==========================================

function looksLikeGovernmentRecord(title) {
    const text = title.toLowerCase();

    const keywords = [
        "recruitment",
        "examination",
        "exam",
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
        "commission",
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

    return keywords.some(keyword => text.includes(keyword));
}

// ==========================================
// DETERMINE CATEGORY
// ==========================================

function getCategory(title) {
    const text = title.toLowerCase();

    if (
        text.includes("admit card") ||
        text.includes("e-admit") ||
        text.includes("hall ticket")
    ) {
        return "Admit Card";
    }

    if (
        text.includes("result") ||
        text.includes("marks of") ||
        text.includes("written result") ||
        text.includes("final result")
    ) {
        return "Result";
    }

    if (
        text.includes("notification") ||
        text.includes("advertisement") ||
        text.includes("addendum") ||
        text.includes("notice")
    ) {
        return "Notification";
    }

    return "Job";
}

// ==========================================
// FETCH ONE SOURCE
// ==========================================

async function fetchSource(source, limit) {
    console.log("");
    console.log(`🌐 Fetching ${source.name}...`);

    try {
        const response = await axios.get(source.url, {
            timeout: 20000,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36",
                "Accept":
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            },
            maxRedirects: 5,
            validateStatus: status => status >= 200 && status < 500
        });

        console.log(`✅ ${source.name}: HTTP ${response.status}`);

        if (response.status !== 200) {
            console.log(`⚠️ ${source.name}: HTTP ${response.status}`);
            return [];
        }

        const $ = cheerio.load(response.data);

        const jobs = [];
        const seen = new Set();

        $("a").each((index, element) => {
            if (jobs.length >= limit) {
                return false;
            }

            const title = cleanText($(element).text());
            const href = $(element).attr("href");

            if (!title || !href) {
                return;
            }

            if (title.length < 10 || title.length > 300) {
                return;
            }

            if (!looksLikeGovernmentRecord(title)) {
                return;
            }

            const link = absoluteUrl(source.baseUrl, href);

            if (!link) {
                return;
            }

            const key = `${source.name}|${title}|${link}`;

            if (seen.has(key)) {
                return;
            }

            seen.add(key);

            jobs.push({
                title,
                company: getCompanyName(source.name),
                location: "India",
                salary: "See official notification",
                type: "Government",
                experience: "See official notification",
                qualification: "See official notification",
                vacancies: "See official notification",
                lastDate: "See official notification",
                category: getCategory(title),
                source: source.name,
                sourceUrl: link,
                applyUrl: link,
                externalId: `${source.name}-${Buffer.from(key).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 80)}`
            });
        });

        console.log(
            `📄 ${source.name}: ${jobs.length} useful government records found`
        );

        return jobs;

    } catch (error) {
        console.log(
            `❌ ${source.name} error: ${error.message}`
        );

        return [];
    }
}

// ==========================================
// COMPANY / DEPARTMENT NAME
// ==========================================

function getCompanyName(source) {
    if (source === "UPSC") {
        return "Union Public Service Commission";
    }

    if (source === "SSC") {
        return "Staff Selection Commission";
    }

    if (source === "RRB") {
        return "Railway Recruitment Board";
    }

    return source;
}

// ==========================================
// REMOVE DUPLICATES
// ==========================================

function removeDuplicates(jobs) {
    const map = new Map();

    for (const job of jobs) {
        const key =
            job.externalId ||
            `${job.source}|${job.title}|${job.sourceUrl}`;

        if (!map.has(key)) {
            map.set(key, job);
        }
    }

    return Array.from(map.values());
}

// ==========================================
// MAIN FETCH FUNCTION
// ==========================================

async function fetchJobs(options = {}) {

    const limit = Math.min(
        Number(options.limit) || 50,
        200
    );

    console.log("");
    console.log("🇮🇳 JOBMITRA INDIA");
    console.log("🏛️ REAL GOVERNMENT JOB ENGINE");
    console.log("🔄 Fetching official government sources...");

    let allJobs = [];

    for (const source of SOURCES) {

        const remaining = Math.max(
            limit - allJobs.length,
            0
        );

        if (remaining <= 0) {
            break;
        }

        const jobs = await fetchSource(
            source,
            remaining
        );

        allJobs.push(...jobs);
    }

    allJobs = removeDuplicates(allJobs);

    // ======================================
    // CATEGORY SUMMARY
    // ======================================

    const summary = {};

    for (const job of allJobs) {
        summary[job.category] =
            (summary[job.category] || 0) + 1;
    }

    console.log("");
    console.log(
        `✅ REAL GOVERNMENT RECORDS FOUND: ${allJobs.length}`
    );

    console.log("");
    console.log("📊 CATEGORY SUMMARY:");

    for (const [category, count
