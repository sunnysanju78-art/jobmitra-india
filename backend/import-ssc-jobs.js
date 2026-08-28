const fs = require("fs");

const notices = JSON.parse(
  fs.readFileSync("ssc-notices.json", "utf8")
);

const db = JSON.parse(
  fs.readFileSync("jobmitra-db.json", "utf8")
);

const existingJobs = db.jobs || [];

function cleanTitle(title) {
  return (title || "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUsefulNotice(x) {
  const title = cleanTitle(x.headline).toLowerCase();

  const keywords = [
    "examination",
    "recruitment",
    "vacanc",
    "selection post",
    "selection posts",
    "post code",
    "online application",
    "application form",
    "constable",
    "sub inspector",
    "stenographer",
    "junior engineer",
    "graduate level",
    "higher secondary",
    "hindi translator",
    "mts",
    "havaldar",
    "delhi police",
    "capf"
  ];

  return keywords.some(k => title.includes(k));
}

const useful = notices.filter(isUsefulNotice);

const newJobs = useful.map(x => {
  const pdf = x.attachments?.[0];

  return {
    title: cleanTitle(x.headline),
    company: "Staff Selection Commission",
    department: "SSC",
    location: "India",
    salary: "See official notification",
    type: "Government",
    qualification: "See official notification",
    vacancies: "See official notification",
    lastDate: "See official notification",
    category: "Government Job",
    source: "SSC",
    sourceUrl: "https://ssc.gov.in/",
    applyUrl: "https://ssc.gov.in/",
    notificationUrl: pdf?.path || "",
    notificationFile: pdf?.fileName || "",
    externalId: `SSC-${x.id}`,
    examId: x.examId || "",
    noticeDate: x.createdAt || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
});

// Remove duplicate SSC notices
const existingIds = new Set(
  existingJobs.map(j => j.externalId)
);

const uniqueNewJobs = newJobs.filter(
  j => !existingIds.has(j.externalId)
);

db.jobs = [...existingJobs, ...uniqueNewJobs];
db.lastSync = new Date().toISOString();

fs.writeFileSync(
  "jobmitra-db.json",
  JSON.stringify(db, null, 2)
);

console.log("");
console.log("🔥 SSC GOVERNMENT JOB IMPORT COMPLETE");
console.log("SSC NOTICES:", notices.length);
console.log("USEFUL NOTICES:", useful.length);
console.log("NEW JOBS ADDED:", uniqueNewJobs.length);
console.log("TOTAL JOBS NOW:", db.jobs.length);
console.log("");
console.log("===== SAMPLE SSC JOBS =====");

uniqueNewJobs.slice(0, 10).forEach((j, i) => {
  console.log(`${i + 1}. ${j.title}`);
  console.log(`   DATE: ${j.noticeDate}`);
  console.log(`   PDF: ${j.notificationFile || "NO PDF"}`);
  console.log("");
});
