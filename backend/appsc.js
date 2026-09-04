const axios = require("axios");
const cheerio = require("cheerio");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function makeCategory(title) {
  const t = title.toLowerCase();

  if (/admit|hall ticket|e-admit/.test(t))
    return "Admit Card";

  if (/result|merit|selection list|final key|answer key/.test(t))
    return "Result";

  if (/notification|advertisement|recruitment|vacancy|application/.test(t))
    return "Notification";

  return "Job";
}

async function readAPPSC(limit = 1000) {
  console.log("\n🌐 APPSC");
  console.log("🔧 APPSC: reading official recruitment/notification documents...");

  try {
    const urls = [
      "https://portal-psc.ap.gov.in/Default.aspx",
      "https://psc.ap.gov.in/HomePages/Notifications.aspx",
      "https://psc.ap.gov.in/HomePages/DRSelectionLists.aspx",
      "https://psc.ap.gov.in/HomePages/Results_New.aspx"
    ];

    const results = [];
    const seen = new Set();

    for (const pageUrl of urls) {
      try {
        const r = await axios.get(pageUrl, {
          timeout: 30000,
          headers: HEADERS
        });

        console.log(`✅ APPSC HTTP ${r.status}: ${pageUrl}`);

        const $ = cheerio.load(r.data);

        $("a").each((i, el) => {
          if (results.length >= limit) return false;

          const text = clean($(el).text());
          const href = $(el).attr("href") || "";

          if (!href) return;

          const combined = `${text} ${href}`.toLowerCase();

          const useful =
            combined.includes("/documents/notificationdocuments/") ||
            combined.includes("/documents/results/") ||
            /recruitment|notification|advertisement|vacancy|admit|hall ticket|result|selection|final key|answer key|application/i.test(combined);

          if (!useful) return;

          let link;

          try {
            link = new URL(href, pageUrl).href;
          } catch {
            return;
          }

          if (!link.includes("psc.ap.gov.in")) return;

          const title =
            text ||
            link
              .split("/")
              .pop()
              .replace(/\.(pdf|PDF)$/i, "")
              .replace(/[_-]+/g, " ");

          if (title.length < 8 || title.length > 500) return;

          const key = `APPSC|${title}|${link}`;

          if (seen.has(key)) return;
          seen.add(key);

          results.push({
            title,
            company: "Andhra Pradesh Public Service Commission",
            department: "APPSC",
            location: "Andhra Pradesh",
            state: "Andhra Pradesh",

            salary: "See official notification",
            type: "Government",
            qualification: "See official notification",
            vacancies: "See official notification",
            lastDate: "See official notification",

            category: makeCategory(title),
            source: "APPSC",

            sourceUrl: link,
            url: link,
            applyUrl: link,

            externalId:
              "APPSC-" +
              Buffer.from(key)
                .toString("base64")
                .replace(/[^a-zA-Z0-9]/g, "")
                .slice(0, 80)
          });
        });
      } catch (e) {
        console.log(`⚠️ APPSC page skipped: ${e.message}`);
      }
    }

    console.log(`📄 APPSC records parsed: ${results.length}`);

    return results;
  } catch (e) {
    console.log(`❌ APPSC: ${e.message}`);
    return [];
  }
}

module.exports = { readAPPSC };
