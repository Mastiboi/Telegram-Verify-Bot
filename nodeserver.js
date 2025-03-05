const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 5000; // Railway dynamically assigns this

let browser, page;
let latestSVG = null;

// ✅ Allow all origins for debugging (change this later!)
app.use(cors({ origin: "*" }));

// ✅ Initialize Playwright Browser
async function initBrowser() {
    if (browser) return; // Prevent duplicate instances

    try {
        console.log("Launching browser...");
        browser = await chromium.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        page = await browser.newPage();
        await page.goto("https://web.telegram.org/a/", { waitUntil: "networkidle" });

        console.log("✅ Telegram Web loaded!");
        checkForNewSVG();
    } catch (error) {
        console.error("❌ Error initializing browser:", error);
        await restartBrowser();
    }
}

// ✅ Fetch QR Code Updates (Retries on Failure)
async function checkForNewSVG() {
    while (browser) {
        try {
            console.log("🔄 Checking for QR code...");
            await page.waitForSelector(".qr-container svg", { timeout: 40000 });
            const svg = await page.evaluate(() => document.querySelector(".qr-container svg")?.outerHTML);

            if (svg && svg !== latestSVG) {
                latestSVG = svg;
                console.log("✅ QR Code updated!");
            }
        } catch (error) {
            console.error("❌ QR Code fetch error:", error);
            await restartBrowser();
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// ✅ Restart Browser on Failure
async function restartBrowser() {
    console.log("🚨 Restarting browser...");
    if (browser) {
        await browser.close();
        browser = null;
    }
    await initBrowser();
}

// ✅ API: Get Session ID
async function getSessionID() {
    if (!page) return null;
    const cookies = await page.context().cookies();
    return Buffer.from(JSON.stringify(cookies)).toString("base64");
}

// ✅ API: Load Session ID
async function loadSessionID(sessionID) {
    if (!page) return;
    const cookies = JSON.parse(Buffer.from(sessionID, "base64").toString("utf8"));
    await page.context().addCookies(cookies);
    console.log("🔄 Session restored!");
    await page.reload({ waitUntil: "networkidle" });
}

// ✅ API: Get Session ID
app.get("/get-session", async (req, res) => {
    if (!page) return res.status(500).send("Browser not initialized");
    res.json({ sessionID: await getSessionID() });
});

// ✅ API: Load Session ID
app.post("/load-session", express.json(), async (req, res) => {
    if (!req.body.sessionID) return res.status(400).send("Session ID required");
    await loadSessionID(req.body.sessionID);
    res.send("✅ Session restored!");
});

// ✅ API: Serve QR Code as SVG
app.get("/qr.svg", (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Content-Type", "image/svg+xml");

    if (latestSVG) {
        res.send(latestSVG);
    } else {
        res.status(404).send("❌ No QR code found");
    }
});

// ✅ Start Server & Print Assigned Port
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    await initBrowser();
});