
const fs = require("fs");
const { PDFParse } = require("pdf-parse");

const PDF_FILE = __dirname + "/gds-annexure.pdf";

const circleState = {
  "Andhra Pradesh Circle": "Andhra Pradesh",
  "Assam Circle": "Assam",
  "Bihar Circle": "Bihar",
  "Chhattisgarh Circle": "Chhattisgarh",
  "Delhi Circle": "Delhi",
  "Gujarat Circle": "Gujarat",
  "Haryana Circle": "Haryana",
  "Himachal Pradesh Circle": "Himachal Pradesh",
  "Jammu and Kashmir Circle": "Jammu and Kashmir",
  "Jharkhand Circle": "Jharkhand",
  "Karnataka Circle": "Karnataka",
  "Kerala Circle": "Kerala",
  "Madhya Pradesh Circle": "Madhya Pradesh",
  "Maharashtra Circle": "Maharashtra",
  "North Eastern Circle": "North Eastern",
  "Odisha Circle": "Odisha",
  "Punjab Circle": "Punjab",
  "Rajasthan Circle": "Rajasthan",
  "Tamilnadu Circle": "Tamil Nadu",
  "Telangana Circle": "Telangana",
  "Uttarakhand Circle": "Uttarakhand",
  "Uttar Pradesh Circle": "Uttar Pradesh",
  "West Bengal Circle": "West Bengal"
};

async function readGDS(limit = 1000) {
  console.log("\n📮 India Post GDS");

  try {
    const parser = new PDFParse({
      data: fs.readFileSync(PDF_FILE)
    });

    const result = await parser.getText();
    await parser.destroy();

    const text = String(result.text || "")
      .replace(/\r/g, " ")
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const rowRegex =
      /(\d+)\s+(.+? Circle)\s+(.+?)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)(?=\s+\d+\s+.+? Circle|\s+Total\s)/g;

    const jobs = [];
    let match;

    while ((match = rowRegex.exec(text)) !== null) {
      const circle = match[2].trim();

      if (!circleState[circle]) continue;

      jobs.push({
        title: `Gramin Dak Sevak (GDS) - ${circle} - ${match[3].trim()}`,
        company: "India Post",
        department: "India Post GDS",
        location: circle.replace(/ Circle$/, ""),
        state: circleState[circle],
        salary: "See official notification",
        type: "Government",
        qualification: "10th / Matriculation",
        vacancies: match[13].replace(/,/g, ""),
        lastDate: "21-09-2026",
        category: "Job",
        source: "India Post GDS",
        sourceUrl:
          "https://www.indiapost.gov.in/gdsonlineengagement/pdf/Annexure-Ia.pdf",
        url:
          "https://www.indiapost.gov.in/gdsonlineengagement/pdf/Annexure-Ia.pdf",
        applyUrl:
          "https://app.indiapost.gov.in/gdscandidate",
        externalId:
          `GDS-JULY-2026-${match[1]}-${circle}-${match[3]}`
            .replace(/\s+/g, "-")
            .replace(/[^a-zA-Z0-9-]/g, "")
      });
    }

    const output = jobs.slice(0, limit);

    console.log("📮 GDS records:", output.length);

    if (output.length) {
      console.log("📍 First:", output[0]);
    }

    return output;
  } catch (error) {
    console.log("❌ GDS error:", error.message);
    return [];
  }
}

module.exports = { readGDS };
