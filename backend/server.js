require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const db = require("./database");
const { fetchJobs } = require("./jobFetcher");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// ======================================
// FRONTEND
// ======================================

app.use(express.static(path.join(__dirname, "..")));

// ======================================
// HOME
// ======================================

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "index.html"));
});

// ======================================
// STATUS
// ======================================

app.get("/api/status", (req, res) => {
    res.json({
        app: "JOBMITRA INDIA",
        status: "online",
        source: "IndianAPI",
        automaticUpdates: true,
        interval: "10 minutes",
        databaseJobs: db.getJobs().length
    });
});

// ======================================
// ALL JOBS
// ======================================

app.get("/api/jobs", (req, res) => {
    try {
        const jobs = db.getJobs().map(job => ({
            ...job,
            company: job.company === "Railway Recruitment Board" && job.source && job.source !== "Railway Recruitment Board"
                ? job.source
                : job.company
        }));

        res.json({
            success: true,
            count: jobs.length,
            jobs
        });

    } catch (error) {

        console.error("❌ Database error:", error.message);

        res.status(500).json({
            success: false,
            error: "Database error"
        });
    }
});

// ======================================
// SEARCH
// ======================================

app.get("/api/jobs/search", (req, res) => {

    try {

        const q = String(req.query.q || "")
            .toLowerCase()
            .trim();

        const jobs = db.getJobs();

        if (!q) {
            return res.json({
                success: true,
                count: jobs.length,
                jobs
            });
        }

        const result = jobs.filter(job =>
            JSON.stringify(job)
                .toLowerCase()
                .includes(q)
        );

        res.json({
            success: true,
            query: q,
            count: result.length,
            jobs: result
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: "Search failed"
        });
    }
});

// ======================================
// CATEGORY
// ======================================

app.get("/api/jobs/category/:category", (req, res) => {

    try {

        const category =
            String(req.params.category || "")
                .toLowerCase()
                .trim();

        const jobs = db.getJobs();

        let result;

        if (category === "all") {

            result = jobs;

        } else if (category === "government" || category === "govt") {

            result = jobs.filter(job => {

                const text =
                    JSON.stringify(job).toLowerCase();

                return (
                    text.includes("government") ||
                    text.includes("govt") ||
                    text.includes("sarkari") ||
                    text.includes("railway") ||
                    text.includes("ssc") ||
                    text.includes("upsc") ||
                    text.includes("psu") ||
                    text.includes("defence")
                );
            });

        } else if (category === "private") {

            result = jobs.filter(job => {

                const text =
                    JSON.stringify(job).toLowerCase();

                return !(
                    text.includes("government") ||
                    text.includes("govt") ||
                    text.includes("sarkari") ||
                    text.includes("railway") ||
                    text.includes("ssc") ||
                    text.includes("upsc") ||
                    text.includes("psu")
                );
            });

        } else {

            result = jobs.filter(job =>
                JSON.stringify(job)
                    .toLowerCase()
                    .includes(category)
            );
        }

        res.json({
            success: true,
            category,
            count: result.length,
            jobs: result
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            error: "Category search failed"
        });
    }
});

// ======================================
// AUTOMATIC JOB SYNC
// ======================================

async function syncJobs() {

    console.log("");
    console.log("🔄 Automatic job sync started...");
    console.log("🌐 Connecting to IndianAPI...");

    try {

        const jobs = await fetchJobs({
            limit: 10000
        });

        console.log(`📥 Jobs fetched: ${jobs.length}`);

        if (jobs.length === 0) {

            console.log(
                "⚠️ No new jobs received. Existing database jobs kept safely."
            );

            return;
        }

        const result = db.saveJobs(jobs);

        if (db.updateLastSync) {
            db.updateLastSync();
        }

        console.log(`➕ New jobs: ${result.added}`);
        console.log(`♻️ Updated jobs: ${result.updated}`);
        console.log(`📦 Total database jobs: ${result.total}`);

        console.log("✅ Automatic job sync completed");

    } catch (error) {

        console.error(
            "❌ Automatic sync failed:",
            error.message
        );
    }
}

// ======================================
// AUTOMATIC UPDATE EVERY 10 MINUTES
// ======================================

setInterval(
    syncJobs,
    10 * 60 * 1000
);

// ======================================
// FIRST SYNC
// ======================================

syncJobs();

// ======================================
// START SERVER
// ======================================

app.listen(PORT, "0.0.0.0", () => {

    console.log("");
    console.log("======================================");
    console.log("🇮🇳 JOBMITRA INDIA");
    console.log("======================================");
    console.log(`🌐 Website: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api/jobs`);
    console.log("🔄 Automatic updates: ON");
    console.log("⏱️ Update interval: 10 minutes");
    console.log(`📦 Database jobs: ${db.getJobs().length}`);
    console.log("======================================");
    console.log("");
});
