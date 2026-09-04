const axios = require("axios");
const cheerio = require("cheerio");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36"
};

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

async function readTNPSC(limit = 1000) {
  console.log("\n🌐 TNPSC");
  console.log("🔧 TNPSC: reading official Notifications page...");

  try {
    const url = "https://www.tnpsc.gov.in/English/Notification.aspx";

    const r = await axios.get(url, {
      timeout: 30000,
      headers: HEADERS
    });

    console.log(`✅ TNPSC HTTP ${r.status}`);

    const $ = cheerio.load(r.data);
    const results = [];
    const seen = new Set();

    $("a").each((i, el) => {
      if (results.length >= limit) return false;

      const title = clean($(el).text());
      const href = $(el).attr("href") || "";

      if (!title || !href) return;

      if (
        !/recruit|notification|vacancy|advertisement|application|post|selection/i.test(
          title + " " + href
        )
      ) {
        return;
      }

      if (title.length < 10 || title.length > 500) return;

      const link = new URL(
        href,
        "https://www.tnpsc.gov.in/English/Notification.aspx"
      ).href;

      const key = `TNPSC|${title}|${link}`;

      if (seen.has(key)) return;
      seen.add(key);

      results.push({
        title,
        company: "Tamil Nadu Public Service Commission",
        department: "TNPSC",
        location: "Tamil Nadu",
        state: "Tamil Nadu",
        salary: "See official notification",
        type: "Government",
        qualification: "See official notification",
        vacancies: "See official notification",
        lastDate: "See official notification",
        category: /result/i.test(title)
          ? "Result"
          : /admit|hall ticket/i.test(title)
          ? "Admit Card"
          : /notification|advertisement/i.test(title)
          ? "Notification"
          : "Job",
        source: "TNPSC",
        sourceUrl: link,
        url: link,
        applyUrl: link,
        externalId: `TNPSC-${Buffer.from(key)
          .toString("base64")
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 80)}`
      });
    });

    console.log(`📄 TNPSC records parsed: ${results.length}`);

    return results;
  } catch (e) {
    console.log(`❌ TNPSC: ${e.message}`);
    return [];
  }
}

module.exports = { readTNPSC };
