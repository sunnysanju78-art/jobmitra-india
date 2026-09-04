const axios = require("axios");

const URL = "https://drdo.gov.in/drdo/offerings/vacancies";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36"
};

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function titleFromUrl(link) {
  try {
    const cleanLink = String(link).replace(/^http:/i, "https:");
    const path = cleanLink.split("?")[0].split("#")[0];
    const slug = path.substring(path.lastIndexOf("/") + 1);

    return clean(
      decodeURIComponent(slug)
        .replace(/[-_]+/g, " ")
        .replace(/\\b\\w/g, c => c.toUpperCase())
    ) || "DRDO Vacancy";
  } catch {
    return "DRDO Vacancy";
  }
}

async function readDRDO(limit = 1000) {
  console.log("\n🌐 DRDO");
  console.log("🔧 DRDO: reading official Vacancies page...");

  try {
    const response = await axios.get(URL, {
      timeout: 15000,
      headers: HEADERS
    });

    console.log(`✅ DRDO HTTP ${response.status}`);

    const html = String(response.data || "");

    // Extract every official DRDO vacancy detail URL directly from HTML.
    const regex =
      /https?:\/\/drdo\.gov\.in\/drdo\/en\/offerings\/vacancies\/[a-z0-9%._~:/?#\[\]@!$&'()*+,;=-]+/gi;

    const matches = html.match(regex) || [];

    const results = [];
    const seen = new Set();

    for (const raw of matches) {
      if (results.length >= limit) break;

      // Remove HTML punctuation that can be attached to URLs.
      const link = raw
        .replace(/["'<>),;]+$/g, "")
        .replace(/&amp;/g, "&");

      if (!link) continue;

      const key = `DRDO|${link}`;

      if (seen.has(key)) continue;
      seen.add(key);

      const title = titleFromUrl(link);

      results.push({
        title,
        company: "Defence Research and Development Organisation",
        department: "DRDO",
        location: "India",
        state: "All India",
        salary: "See official notification",
        type: "Government",
        qualification: "See official notification",
        vacancies: "See official notification",
        lastDate: "See official notification",
        category: "Job",
        source: "DRDO",
        sourceUrl: link,
        url: link,
        applyUrl: link,
        externalId:
          "DRDO-" +
          Buffer.from(key)
            .toString("base64")
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(0, 80)
      });
    }

    console.log(`🔎 DRDO vacancy URLs found: ${matches.length}`);
    console.log(`📄 DRDO records parsed: ${results.length}`);

    return results;

  } catch (error) {
    console.log(`❌ DRDO: ${error.message}`);
    return [];
  }
}

module.exports = { readDRDO };
