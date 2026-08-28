const axios = require("axios");
const cheerio = require("cheerio");

const TIMEOUT = 20000;
const DEFAULT_LIMIT = 200;

const SOURCES = [
    {
        name: "UPSC",
        company: "Union Public Service Commission",
        url: "https://upsc.gov.in/recruitment/recruitment-advertisement",
        baseUrl: "https://upsc.gov.in"
    },
    {
        name: "SSC",
        company: "Staff Selection Commission",
        url: "https://ssc.gov.in/",
        baseUrl: "https://ssc.gov.in"
    },
    {
        name: "RRB",
        company: "Railway Recruitment Board",
        url: "https://rrbcdg.gov.in/",
        baseUrl: "https://rrbcdg.gov.in"
    },
    {
        name: "IBPS",
        company: "Institute of Banking Personnel Selection",
        url: "https://www.ibps.in/",
        baseUrl: "https://www.ibps.in"
    }
];

function cleanText(text) {
    return String(text || "")
        .replace(/\s+/g, " ")
        .trim();
}

function makeAbsolute(baseUrl, href) {
    try {
        return new URL(href, baseUrl).href;
    } catch {
        return "";
    }
}

function isUsefulTitle(title) {
    const t = title.toLowerCase();

    if (title.length < 15 || title.length > 350) {
        return false;
    }

    const blocked = [
        "skip to main content",
        "home",
        "about us",
        "contact us",
        "login",
        "register",
        "privacy policy",
        "terms and conditions",
        "citizen's charter",
        "constitutional provisions",
        "historical perspective",
        "previous question papers",
        "marks information",
        "forms & downloads",
        "helpdesk",
        "helpline",
        "feedback",
        "sitemap",
        "site map",
        "accessibility"
    ];

    if (blocked.includes(t)) {
        return false;
    }

    return true;
}

function detectCategory(title) {
    const t = title.toLowerCase();

    if (
        t.includes("admit card") ||
        t.includes("e-admit") ||
        t.includes("hall ticket") ||
        t.includes("call letter")
    ) {
        return "Admit Card";
    }

    if (
        t.includes("answer key") ||
        t.includes("answer keys")
    ) {
        return "Answer Key";
    }

    if (
        t.includes("result") ||
        t.includes("marks of recommended") ||
        t.includes("reserve list") ||
        t.includes("selection list")
    ) {
        return "Result";
    }

    if (
        t.includes("recruitment") ||
        t.includes("vacancy") ||
        t.includes("vacancies") ||
        t.includes("advertisement") ||
        t.includes("advt") ||
        t.includes("post of") ||
        t.includes("posts of") ||
        t.includes("officer") ||
        t.includes("assistant") ||
        t.includes("engineer") ||
        t.includes("inspector") ||
        t.includes("constable") ||
        t.includes("technician") ||
        t.includes("teacher") ||
        t.includes("clerk") ||
        t.includes("stenographer") ||
        t.includes("apprentice") ||
        t.includes("group a") ||
        t.includes("group b") ||
        t.includes("group c") ||
        t.includes("group d") ||
        t.includes("civil services") ||
        t.includes("defence services") ||
        t.includes("defence examination") ||
        t.includes("academy examination") ||
        t.includes("forest service") ||
        t.includes("medical services") ||
        t.includes("engineering services") ||
        t.includes("geo-scientist") ||
        t.includes("economic service") ||
        t.includes("statistical service") ||
        t.includes("armed police forces") ||
        t.includes("selection post") ||
        t.includes("combined graduate") ||
        t.includes("combined higher secondary") ||
        t.includes("railway") ||
        t.includes("bank") ||
        t.includes("probationary officer") ||
        t.includes("clerk")
    ) {
        return "Job";
    }

    if (
        t.includes("notification") ||
        t.includes("notice") ||
        t.includes("addendum") ||
        t.includes("corrigendum")
    ) {
        return "Notification";
    }

    return null;
}

function detectDepartment(sourceName, title) {
    const t = title.toLowerCase();

    if (sourceName === "UPSC") {
        if (
            t.includes("defence") ||
            t.includes("armed police") ||
            t.includes("naval") ||
            t.includes("academy")
        ) {
            return "Defence";
        }

        if (
            t.includes("railway") ||
            t.includes("rail")
        ) {
            return "Railway";
        }

        return "Central Govt";
    }

    if (sourceName === "SSC") {
        return "SSC";
    }

    if (sourceName === "RRB") {
        return "Railway";
    }

    if (sourceName === "IBPS") {
        return "Banking";
    }

    return "Government";
}

function createId(source, link) {
    return (
        source +
        "-" +
        Buffer
            .from(link)
            .toString("base64")
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(0, 80)
    );
}

async function fetchSource(source, limit) {
    console.log("");
    console.log(`🌐 Fetching ${source.name}...`);

    try {
        const response = await axios.get(source.url, {
            timeout: TIMEOUT,
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
                "Accept":
                    "text/html,application/xhtml+xml,application/xml"
            },
            validateStatus(status) {
                return status >= 200 && status < 400;
            }
        });

        console.log(
            `✅ ${source.name}: HTTP ${response.status}`
        );

        const $ = cheerio.load(response.data);

        const jobs = [];
        const seen = new Set();

        $("a").each(function () {
            if (jobs.length >= limit) {
                return false;
            }

            const title = cleanText(
                $(this).text()
            );

            const href = $(this).attr("href");

            if (!title || !href) {
                return;
            }

            if (!isUsefulTitle(title)) {
                return;
            }

            const link = makeAbsolute(
                source.baseUrl,
                href
            );

            if (!link) {
                return;
            }

            if (!link.startsWith(source.baseUrl)) {
                return;
            }

            const category = detectCategory(title);

            if (!category) {
                return;
            }

            const key =
                source.name +
                "|" +
                title.toLowerCase() +
                "|" +
                link;

            if (seen.has(key)) {
                return;
            }

            seen.add(key);

            jobs.push({
                title,
                company: source.company,
                department: detectDepartment(
                    source.name,
                    title
                ),
                location: "India",
                salary: "See Notification",
                type: "Government",
                experience: "See Notification",
                qualification: "See Notification",
                vacancies: "See Notification",
                lastDate: "See Notification",
                category,
                source: source.name,
                notificationLink: link,
                applyLink: link,
                externalId: createId(
                    source.name,
                    link
                )
            });
        });

        console.log(
            `📄 ${source.name}: ${jobs.length} useful records found`
        );

        return jobs;

    } catch (error) {
        console.log(
            `❌ ${source.name} error: ${error.message}`
        );

        return [];
    }
}

async function fetchJobs(options = {}) {
    const limit =
        Number(options.limit) > 0
            ?
