const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/139 Mobile Safari/537.36"
};

const agent = new https.Agent({ rejectUnauthorized: false });

function clean(s = "") {
  return String(s).replace(/\s+/g, " ").trim();
}

function absolute(base, href) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

async function getPage(url) {
  try {
    return await axios.get(url, {
      timeout: 20000,
      headers: HEADERS,
      maxRedirects: 5
    });
  } catch (e) {
    if (/certificate|SSL|EPROTO|CERT_/i.test(String(e.message))) {
      return axios.get(url, {
        timeout: 30000,
        headers: HEADERS,
        maxRedirects: 5,
        httpsAgent: agent
      });
    }
    throw e;
  }
}

async function readSource(source, limit = 100) {
  console.log(`\n🌐 ${source.name}`);

  try {
    const r = await getPage(source.url);
    console.log(`✅ HTTP ${r.status}`);

    const $ = cheerio.load(r.data);
    const jobs = [];
    const seen = new Set();

    $("a").each((i, el) => {
      if (jobs.length >= limit) return false;

      const title = clean($(el).text());
      const href = $(el).attr("href");

      if (!title || !href || title.length < 8) return;

      const link = absolute(source.url, href);
      if (!link || seen.has(link)) return;

      seen.add(link);

      jobs.push({
        title,
        company: source.name,
        department: source.department,
        location: "All India",
        state: "All India",
        type: "Government",
        category: "Job",
        source: source.name,
        sourceUrl: link,
        url: link,
        applyUrl: link,
        qualification: "See official notification",
        salary: "See official notification",
        vacancies: "See official notification",
        lastDate: "See official notification",
        externalId: `${source.name}|${link}`
      });
    });

    console.log(`📄 Records: ${jobs.length}`);
    return jobs;
  } catch (e) {
    console.log(`❌ ${source.name}: ${e.message}`);
    return [];
  }
}

const BANKS = [
  ["Bank of Maharashtra", "https://bankofmaharashtra.in/career"],
  ["UCO Bank", "https://www.ucobank.com/careers.aspx"],
  ["Indian Bank", "https://www.indianbank.in/career/"],
  ["Bank of India", "https://bankofindia.co.in/career"],
  ["Canara Bank", "https://canarabank.com/pages/Careers"],
  ["Bank of Baroda", "https://www.bankofbaroda.in/career/current-openings"],
  ["Central Bank of India", "https://centralbankofindia.co.in/en/recruitment"],
  ["Union Bank of India", "https://www.unionbankofindia.bank.in/en/common/recruitment"],
  ["PNB", "https://www.pnbindia.in/recruitments.aspx"],
  ["SBI", "https://sbi.co.in/web/careers"],
  ["IBPS", "https://www.ibps.in/index.php/current-openings/"]
].map(([name, url]) => ({
  name,
  url,
  department: "Banking"
}));

const DEFENCE = [
  ["Indian Army", "https://joinindianarmy.nic.in/"],
  ["Indian Navy", "https://www.joinindiannavy.gov.in/"],
  ["Indian Air Force", "https://agnipathvayu.cdac.in/"],
  ["CAPF", "https://rect.crpf.gov.in/"],
  ["Coast Guard", "https://joinindiancoastguard.cdac.in/"],
  ["RPF", "https://rpf.indianrailways.gov.in/"]
].map(([name, url]) => ({
  name,
  url,
  department: name === "RPF" ? "Railways" : "Defence"
}));


async function readBankDefence(limit = 50) {
  const all = [];

  for (const source of [...BANKS, ...DEFENCE]) {
    try {
      const rows = await Promise.race([
        readSource(source, limit),
        new Promise(resolve => setTimeout(() => {
          console.log(`⏱️ ${source.name}: 10s timeout`);
          resolve([]);
        }, 10000))
      ]);
      all.push(...(Array.isArray(rows) ? rows : []));
    } catch (e) {
      console.log(`⚠️ ${source.name}: ${e.message}`);
    }
  }

  const unique = [];
  const seen = new Set();

  for (const job of all) {
    if (seen.has(job.externalId)) continue;
    seen.add(job.externalId);
    unique.push(job);
  }

  console.log("\n================================");
  console.log(`🏦 BANK + 🪖 DEFENCE TOTAL: ${unique.length}`);
  console.log("================================");

  return unique;
}

module.exports = {
  BANKS,
  DEFENCE,
  readBankDefence
};
