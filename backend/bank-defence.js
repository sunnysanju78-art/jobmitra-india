const axios = require("axios");
const cheerio = require("cheerio");
const https = require("https");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/139 Mobile Safari/537.36"
};

const agent = new https.Agent({ rejectUnauthorized: false });

const clean = (s = "") =>
  String(s).replace(/\s+/g, " ").trim();

function absolute(base, href) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

async function getPage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    return await axios.get(url, {
      timeout: 7500,
      signal: controller.signal,
      headers: HEADERS,
      maxRedirects: 5,
      httpsAgent: agent
    });
  } finally {
    clearTimeout(timer);
  }
}

const RECRUITMENT_WORDS =
  /recruit|recruitment|career|careers|vacanc|vacancy|job|jobs|notification|advertisement|advt|apprentice|engagement|hiring|opening|opportunit|apply|joining|selection|post|exam/i;

const IGNORE_WORDS =
  /login|logout|privacy|sitemap|contact us|feedback|tender|procurement|press release|gallery|media|annual report/i;

async function readSource(source, limit = 50) {
  console.log(`🌐 ${source.name}`);

  try {
    const r = await getPage(source.url);
    console.log(`✅ ${source.name}: HTTP ${r.status}`);

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

      const combined = `${title} ${link}`;

      if (!RECRUITMENT_WORDS.test(combined)) return;
      if (IGNORE_WORDS.test(title)) return;

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

    console.log(`📄 ${source.name}: ${jobs.length}`);
    return jobs;
  } catch (e) {
    const msg =
      e.name === "CanceledError" || e.code === "ERR_CANCELED"
        ? "TIMEOUT"
        : e.code || e.message;

    console.log(`⚠️ ${source.name}: ${msg}`);
    return [];
  }
}

const BANKS = [
  ["Bank of Maharashtra", "https://bankofmaharashtra.in/career"],
  ["UCO Bank", "https://www.ucobank.com/careers.aspx"],
  ["Indian Bank", "https://www.indianbank.in/career/"],
  ["Bank of India", "https://bankofindia.co.in/career"],
  ["Canara Bank", "https://canarabank.com/pages/Careers"],
  ["Bank of Baroda", "https://bankofbaroda.bank.in/career"],
  ["Central Bank of India", "https://centralbankofindia.co.in/en/recruitment"],
  ["Union Bank of India", "https://www.unionbankofindia.bank.in/en/common/recruitment"],
  ["PNB", "https://www.pnbindia.in/recruitments.aspx"],
  ["SBI", "https://sbi.co.in/web/careers"],
  ["IBPS", "https://www.ibps.in/index.php/current-openings/"],
  ["RBI", "https://opportunities.rbi.org.in/"],
  ["NABARD", "https://www.nabard.org/careers-notices.aspx"],
  ["SEBI", "https://www.sebi.gov.in/careers.html"],
  ["SIDBI", "https://www.sidbi.in/en/careers"],
  ["LIC", "https://licindia.in/careers"],
  ["NIACL", "https://www.newindia.co.in/recruitment"],
  ["OICL", "https://orientalinsurance.org.in/recruitment"],
  ["GIC", "https://www.gicre.in/en/careers"],
  ["PFRDA", "https://pfrda.org.in/web/pfrda/careers"]
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
  ["BSF", "https://rectt.bsf.gov.in/"],
  ["CRPF", "https://rect.crpf.gov.in/"],
  ["CISF", "https://www.cisf.gov.in/"],
  ["ITBP", "https://recruitment.itbpolice.nic.in/"],
  ["SSB", "https://recruitment.ssb.gov.in/"],
  ["Coast Guard", "https://joinindiancoastguard.cdac.in/"],
  ["DRDO", "https://www.drdo.gov.in/drdo/offerings/vacancies"],
  ["ISRO", "https://www.isro.gov.in/CurrentOpportunities.html"],
  ["HAL", "https://hal-india.co.in/career"],
  ["BEL", "https://bel-india.in/job-notifications/"],
  ["RPF", "https://rpf.indianrailways.gov.in/"]
].map(([name, url]) => ({
  name,
  url,
  department: name === "RPF" ? "Railways" : "Defence"
}));

async function readBankDefence(limit = 50) {
  const sources = [...BANKS, ...DEFENCE];
  const all = [];

  const BATCH_SIZE = 6;

  for (let i = 0; i < sources.length; i += BATCH_SIZE) {
    const batch = sources.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(source => readSource(source, limit))
    );

    for (const rows of results) {
      if (Array.isArray(rows)) all.push(...rows);
    }
  }

  const unique = [];
  const seen = new Set();

  for (const job of all) {
    if (!job.externalId || seen.has(job.externalId)) continue;
    seen.add(job.externalId);
    unique.push(job);
  }

  console.log("\n================================");
  console.log(`🏦 BANK + 🪖 DEFENCE TOTAL: ${unique.length}`);
  console.log("================================");

  const counts = {};

  for (const job of unique) {
    counts[job.source] = (counts[job.source] || 0) + 1;
  }

  console.log(counts);

  return unique;
}

module.exports = {
  BANKS,
  DEFENCE,
  readBankDefence
};
