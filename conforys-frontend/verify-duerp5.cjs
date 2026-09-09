const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("http://localhost:5173/login");
  await page.fill('input[type="email"]', "f.ndiaye@petromer.sn");
  await page.fill('input[type="password"]', "Qhse2026!");
  await page.click('button[type="submit"]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });

  await page.goto("http://localhost:5173/duerp");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "verify-duerp5.png", fullPage: true });

  // Ouvre le formulaire "Identifier un risque"
  await page.click('button:has-text("Identifier un risque")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: "verify-duerp5-modal.png", fullPage: true });

  // Active la cotation residuelle
  await page.click('input[type="checkbox"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: "verify-duerp5-modal-residuelle.png", fullPage: true });

  console.log("Console errors:", errors.length ? errors : "none");
  await browser.close();
})();
