const { readBankDefence } = require("./bank-defence");
const { readIndiaPost } = require("./india-post");
const { readGDS } = require("./gds");
const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const { readTGPSC } = require("./tgpsc");
const { readTNPSC } = require("./tnpsc");
const { readAPPSC } = require("./appsc");
const { readDRDO } = require("./drdo");
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
    const t = String(title || "").toLowerCase();

    if (
        t.includes("admit card") ||
        t.includes("e-admit") ||
        t.includes("hall ticket")
    ) {
        return "Admit Card";
    }

    if (
        t.includes("result") ||
        t.includes("marks of") ||
        t.includes("written result") ||
        t.includes("final result") ||
        t.includes("merit list")
    ) {
        return "Result";
    }

    if (
        t.includes("notification") ||
        t.includes("advertisement") ||
        t.includes("addendum") ||
        t.includes("notice")
    ) {
        return "Notification";
    }

    return "Job";
}

function useful(title) {
    const t = String(title || "").toLowerCase();

    const strong = [
        "recruitment",
        "recruitment notice",
        "recruitment notification",
        "recruitment advertisement",
        "online recruitment",
        "online application",
        "apply online",
        "vacancy",
        "vacancies",
        "job notification",
        "employment notification",
        "selection process",
        "engagement of",
        "appointment of",
        "hiring"
    ];

    const exam = [
        "admit card",
        "e-admit",
        "hall ticket",
        "examination",
        "exam notification",
        "exam date",
        "answer key",
        "result",
        "merit list",
        "shortlisted",
        "cut off",
        "cutoff"
    ];

    const govt = [
        "civil services",
        "engineering services",
        "medical services",
        "forest service",
        "defence",
        "nda",
        "cds",
        "capf",
        "staff selection",
        "railway recruitment",
        "combined competitive",
        "specialist officer",
        "probationary officer",
        "junior associate",
        "clerk recruitment",
        "assistant recruitment",
        "manager recruitment",
        "officer recruitment"
    ];

    const blocked = [
        "corporate mission",
        "corporate loans",
        "corporate governance",
        "investor calendar",
        "contact details",
        "contact us",
        "customer care",
        "products",
        "services",
        "interest rates",
        "branch locator",
        "financial results",
        "annual report",
        "privacy policy",
        "terms and conditions",
        "about us",
        "bhandaran",
        "coldware secure",
        "internet banking",
        "mandate management",
        "nodal officer",
        "sunday,",
        "monday,",
        "tuesday,",
        "wednesday,",
        "thursday,",
        "friday,",
        "saturday,"
    ];

    if (blocked.some(x => t.includes(x))) {
        return false;
    }

    return (
        strong.some(x => t.includes(x)) ||
        exam.some(x => t.includes(x)) ||
        govt.some(x => t.includes(x))
    );
}


// ============================================================
// KPSC
// ============================================================

async function readKPSC(limit = 1000) {
    const source = SOURCES.find(s => s.name === "KPSC");

    if (!source) {
        console.log("❌ KPSC source not found");
        return [];
    }

    console.log("\n🌐 KPSC");
    console.log("🔧 KPSC: using AJAX notification endpoint...");

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

        const $ = cheerio.load(response.data, {
            xmlMode: true
        });

        const results = [];
        const seen = new Set();

        $("tbody tr").each((i, el) => {
            if (results.length >= limit) {
                return false;
            }

            const cells = $(el).find("td");

            if (cells.length < 6) {
                return;
            }

            const title = clean($(cells[0]).text());
            const notificationNo = clean($(cells[1]).text());
            const notificationDate = clean($(cells[2]).text());
            const startDate = clean($(cells[3]).text());
            const lastDate = clean($(cells[4]).text());
            const pdfHref = $(cells[5]).find("a").attr("href");

            if (!title || !notificationNo) {
                return;
            }

            const key = `${title}|${notificationNo}`;

            if (seen.has(key)) {
                return;
            }

            seen.add(key);

            const applyUrl =
                "https://kpsconline.karnataka.gov.in/Login/Login";

            let url = applyUrl;

            if (pdfHref) {
                url = absolute(
                    "https://kpsconline.karnataka.gov.in",
                    pdfHref
                ) || applyUrl;
            }

            results.push({
                title,
                company: "Karnataka Public Service Commission",
                department: "KPSC",
                location: "Karnataka",
                state: "Karnataka",
                salary: "See official notification",
                type: "Government",
                qualification: detectQualification(title),
                vacancies: detectVacancies(title),
                category: "Notification",
                source: "KPSC",
                sourceUrl: url,
                url,
                applyUrl,
                externalId: `KPSC-${notificationNo}`,
                notificationNumber: notificationNo,
                notificationDate,
                applicationStartDate: startDate,
                applicationLastDate: lastDate
            });
        });

        console.log(
            `📄 KPSC notifications parsed: ${results.length}`
        );

        return results;

    } catch (e) {
        console.log(`❌ KPSC AJAX: ${e.message}`);
        return [];
    }
}


// ============================================================
// RRB DEDICATED READER
// ============================================================

async function readRRB(limit = 1000) {

    const source = SOURCES.find(
        s => s.name === "Railway Recruitment Board"
    );

    if (!source) {
        console.log("❌ RRB source not found");
        return [];
    }

    console.log("\n🚆 RRB");
    console.log("🔧 RRB: reading CEN notification pages...");

    try {

        const response = await axios.get(
            "https://rrb.indianrailways.gov.in/chandigarh",
            {
                timeout: 30000,
                headers: HEADERS,
                maxRedirects: 5,
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                })
            }
        );

        console.log(`✅ RRB HTTP ${response.status}`);

        const $ = cheerio.load(response.data);

        const results = [];
        const seen = new Set();

        $("a[href*='/getdata?']").each((i, el) => {

            if (results.length >= limit) {
                return false;
            }

            const text = clean($(el).text());
            const href = $(el).attr("href");

            if (!href || !href.includes("category=Notification")) {
                return;
            }

            const match = href.match(
                /cennum=([^&]+).*?loc=([^&]+).*?category=Notification/i
            );

            if (!match) {
                return;
            }

            const cen = decodeURIComponent(match[1]);

            const url = absolute(
                "https://rrb.indianrailways.gov.in",
                href
            );

            if (!url) {
                return;
            }

            const key = `RRB|${cen}|${url}`;

            if (seen.has(key)) {
                return;
            }

            seen.add(key);

            results.push({
                title: text
                    ? `RRB CEN ${cen} - ${text}`
                    : `Railway Recruitment Board CEN ${cen} Notification`,

                company:
                    "Railway Recruitment Board",

                department:
                    "Railway Recruitment Board",

                location:
                    "India",

                state:
                    "All India",

                salary:
                    "See official notification",

                type:
                    "Government",

                qualification:
                    "See official notification",

                vacancies:
                    "See official notification",

                lastDate:
                    "See official notification",

                category:
                    "Job",

                source:
                    "RRB",

                sourceUrl:
                    url,

                url:
                    url,

                applyUrl:
                    url,

                externalId:
                    `RRB-${cen}-${url}`
            });
        });

        console.log(
            `📄 RRB notification records parsed: ${results.length}`
        );

        return results;

    } catch (e) {

        console.log(
            `❌ RRB: ${e.message}`
        );

        return [];
    }
}


// ============================================================
// ============================================================
 // DATA NORMALIZATION HELPERS
 // ============================================================

 function detectQualification(text) {
     const t = String(text || "").toLowerCase();

     if (/\b10th\b|\bssc\b|matric|matriculation/.test(t))
         return "10th / Matriculation";

     if (/\b12th\b|\binter\b|\bhsc\b|higher secondary/.test(t))
         return "12th / Inter";

     if (/\biti\b/.test(t))
         return "ITI";

     if (/\bdiploma\b/.test(t))
         return "Diploma";

     if (/\bdegree\b|graduate|graduation|\bba\b|\bbsc\b|\bbcom\b|\bbe\b|\bbtech\b/.test(t))
         return "Degree / Graduate";

     if (/post graduate|postgraduate|\bpg\b|master|\bma\b|\bmsc\b|\bmcom\b|\bmtech\b/.test(t))
         return "Post Graduate";

     if (/\bphd\b|doctorate/.test(t))
         return "PhD";

     return "See official notification";
 }

 function detectVacancies(text) {
     const m = String(text || "").match(/\b(\d{1,5})\s*(?:posts?|vacancies|vacancy|positions?)\b/i);
     return m ? m[1] : "See official notification";
 }

// NORMAL SOURCE READER
// ============================================================

async function readSource(source, limit = 1000) {
    console.log(`\n🌐 ${source.name}`);

    try {
        let response;

        try {
            response = await axios.get(source.baseUrl, {
                timeout: source.name === "UKPSC" ? 3000 : 20000,
                headers: HEADERS,
                maxRedirects: 5
            });

        } catch (firstError) {

            const message = String(firstError.message || "");

            const sslError =
                message.includes("certificate") ||
                message.includes("EPROTO") ||
                message.includes("SSL") ||
                message.includes("unsafe legacy");

            if (!sslError) {
                throw firstError;
            }

            console.log(
                `⚠️ ${source.name}: HTTPS certificate issue`
            );

            console.log(
                `🔧 ${source.name}: trying safe fallback...`
            );

            response = await axios.get(source.baseUrl, {
                timeout: 30000,
                headers: HEADERS,
                maxRedirects: 5,
                httpsAgent: new https.Agent({
                    rejectUnauthorized: false
                })
            });

            console.log(
                `✅ ${source.name}: fallback connection successful`
            );
        }

        console.log(`✅ HTTP ${response.status}`);

        if (response.status !== 200) {
            return [];
        }

        const $ = cheerio.load(response.data);

        const results = [];
        const seen = new Set();

        $("a").each((i, el) => {

            if (results.length >= limit) {
                return false;
            }

            const title = clean($(el).text());
            const href = $(el).attr("href");

            if (!title || !href) {
                return;
            }

            if (title.length < 10 || title.length > 300) {
                return;
            }

            if (!useful(title)) {
                return;
            }

            const link = absolute(source.baseUrl, href);

            if (!link) {
                return;
            }

            const key =
                `${source.name}|${title}|${link}`;

            if (seen.has(key)) {
                return;
            }

            seen.add(key);

            const company =
                source.name === "UPSC"
                    ? "Union Public Service Commission"
                    : source.name === "SSC"
                        ? "Staff Selection Commission"
                        : source.name === "RRB"
                            ? "Railway Recruitment Board"
                            : source.name;

            results.push({
                title,
                company,
                department: source.name,
                location: source.region || "India",
                state: source.region || "All India",
                salary: "See official notification",
                type: "Government",
                qualification: "See official notification",
                vacancies: "See official notification",
                lastDate: "See official notification",
                category: category(title),
                source: source.name,
                sourceUrl: link,
                url: link,
                applyUrl: link,
                externalId:
                    `${source.name}-${Buffer
                        .from(key)
                        .toString("base64")
                        .replace(/[^a-zA-Z0-9]/g, "")
                        .slice(0, 80)}`
            });
        });

        console.log(`📄 Records: ${results.length}`);

        return results;

    } catch (error) {

        console.log(
            `❌ ${source.name}: ${error.message}`
        );

        return [];
    }
}


// ============================================================
// MAIN JOB FETCHER
// ============================================================

async function fetchJobs(options = {}) {

    /*
     * IMPORTANT:
     * No 500-job final cap.
     *
     * Every source gets scanned.
     * Every unique government record is returned.
     */

    const perSourceLimit =
        Math.max(
            Number(options.perSourceLimit) || 1000,
            1
        );

    console.log("\n🇮🇳 JOBMITRA INDIA");
    console.log("🏛️ GOVERNMENT JOB ENGINE");
    console.log("🔄 MULTI-SOURCE SCAN");

    let jobs = [];
    let bankDefenceBatch = null;
    // BANK + DEFENCE: FETCH ONCE, REUSE PER SOURCE

    for (const source of SOURCES) {

        console.log(
            `\n🔎 SCANNING ${source.name}`
        );

        let data = [];

        if (source.name === "India Post") {
            data = await readIndiaPost(perSourceLimit);
        } else if (source.name === "India Post GDS") {
            data = await readGDS(perSourceLimit);

        } else if (source.name === "KPSC") {
            data = await readKPSC(
                perSourceLimit
            );

        } else if (source.name === "TGPSC") {

            data = await readTGPSC(
                perSourceLimit
            );

        } else if (source.name === "TNPSC") {

            data = await readTNPSC(
                perSourceLimit
            );

        } else if (source.name === "APPSC") {

            data = await readAPPSC(
                perSourceLimit
            );

        } else if (source.name === "DRDO") {

            data = await readDRDO(
                perSourceLimit
            );
                                                                          } else if (["Bank of Maharashtra","UCO Bank","Indian Bank","Bank of India","Canara Bank","Bank of Baroda","Central Bank of India","Union Bank of India","PNB","SBI","IBPS","Indian Army","Indian Navy","Indian Air Force","CAPF","Coast Guard","RPF"].includes(source.name)) {
            if (!bankDefenceBatch) {
                bankDefenceBatch = await readBankDefence(perSourceLimit);
            }
            data = bankDefenceBatch.filter(j => j.source === source.name);


        } else if (source.name === "Railway Recruitment Board") {

            data = await readRRB(
                perSourceLimit
            );

        } else {

            data = await readSource(
                source,
                perSourceLimit
            );
        }

        console.log(
            `📦 ${source.name} returned: ${data.length}`
        );

        jobs.push(...data);
    }


    // ========================================================
    // GLOBAL DEDUPLICATION
    // ========================================================

    const unique = [];
    const ids = new Set();

    for (const job of jobs) {

        const id =
            job.externalId ||
            `${job.source}|${job.title}|${job.url}`;

        if (ids.has(id)) {
            continue;
        }

        ids.add(id);

        unique.push(job);
    }


    // ========================================================
    // SUMMARY
    // ========================================================

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


    // ========================================================
    // NO FINAL 500 LIMIT
    // ========================================================

    console.log(
        `📦 FINAL JOBS RETURNED: ${unique.length}`
    );

    const tgpscCount =
        unique.filter(
            j =>
                String(j.source || "")
                    .toUpperCase() === "TGPSC"
        ).length;

    console.log(
        `🇮🇳 TGPSC IN FINAL RESULT: ${tgpscCount}`
    );

    return unique;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    fetchJobs,
    readKPSC,
    readRRB,
    readSource
};
