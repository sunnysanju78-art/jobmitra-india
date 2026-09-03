const axios = require("axios");

async function readIndiaPost(limit = 1000) {
    console.log("\n📮 India Post");

    try {
        const r = await axios.get(
            "https://www.indiapost.gov.in/vacancies",
            {
                timeout: 30000,
                headers: {
                    "User-Agent": "Mozilla/5.0",
                    "Accept": "*/*",
                    "Accept-Language": "en-US,en;q=0.9"
                }
            }
        );

        const html = String(r.data);

        const marker = '\\"recruitmentData\\":[';
        const start = html.indexOf(marker);

        if (start === -1) {
            console.log("❌ India Post recruitmentData not found");
            return [];
        }

        const dataStart = start + marker.length;
        const endMarker = '],\\"section\\":\\"recruitments\\"';
        const end = html.indexOf(endMarker, dataStart);

        if (end === -1) {
            console.log("❌ India Post recruitmentData end not found");
            return [];
        }

        const raw = "[" + html.slice(dataStart, end) + "]";

        let records;

        try {
            records = JSON.parse(raw.replace(/\\"/g, '"'));
        } catch (e) {
            console.log("❌ India Post JSON parse failed:", e.message);
            return [];
        }

        const jobs = records
            .slice(0, limit)
            .filter(x => x && x.title && x.url)
            .map(x => {
                const link = new URL(
                    x.url,
                    "https://www.indiapost.gov.in"
                ).href;

                const title = String(x.title).trim();

                let category = "Notification";
                const t = title.toLowerCase();

                if (
                    t.includes("recruitment") ||
                    t.includes("vacanc") ||
                    t.includes("filling up") ||
                    t.includes("direct recruitment")
                ) {
                    category = "Job";
                }

                if (t.includes("result") || t.includes("merit list")) {
                    category = "Result";
                }

                if (t.includes("admit card") || t.includes("hall ticket")) {
                    category = "Admit Card";
                }

                return {
                    title,
                    company: "Department of Posts",
                    department: "India Post",
                    location: "India",
                    state: "All India",
                    salary: "See official notification",
                    type: "Government",
                    qualification: "See official notification",
                    vacancies: "See official notification",
                    lastDate: x.date || "See official notification",
                    category,
                    source: "India Post",
                    sourceUrl: link,
                    url: link,
                    applyUrl: link,
                    externalId:
                        "INDIAPOST-" +
                        String(x.id || x.encryptedId || x.slug || title)
                };
            });

        console.log("📮 India Post records:", jobs.length);

        return jobs;

    } catch (error) {
        console.log("❌ India Post error:", error.message);
        return [];
    }
}

module.exports = { readIndiaPost };
