import puppeteer from "puppeteer";
import { Speech } from "./db.js";

async function loadExistingData() {
  const allSpeeches = await Speech.find({}, "pdfLink");
  const dataMap = new Map();
  allSpeeches.forEach((speech) => {
    dataMap.set(speech.pdfLink, true);
  });
  console.log("Loaded existing data into hashmap");
  return dataMap;
}

export async function scrapeRbiSpeeches() {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 100,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    userDataDir: "./temp",
    executablePath: "/usr/bin/google-chrome",
  });
  const page = await browser.newPage();
  const existingDataMap = await loadExistingData();
  let allData = [];

  try {
    // Get the number of documents at the start
    const initialCount = await Speech.countDocuments();
    console.log(
      `Initial number of documents in the collection: ${initialCount}`
    );

    await page.goto("https://www.rbi.org.in/", {
      waitUntil: "load",
      timeout: 0,
    });

    await page.setViewport({ width: 1920, height: 1080 });
    console.log("Navigated to RBI website");

    const menuItem = await page.waitForSelector(
      "text=Speeches & Media Interactions",
      { visible: true }
    );
    await menuItem.hover();

    const siblingElement = await page.evaluateHandle(
      (menuItem) => menuItem.nextElementSibling,
      menuItem
    );

    const speechesItem = await page.evaluateHandle((ulElement) => {
      const listItems = ulElement.querySelectorAll("li");
      return (
        Array.from(listItems).find(
          (item) => item.innerText.trim() === "Speeches"
        ) || null
      );
    }, siblingElement);

    await speechesItem.click();
    await page.waitForNavigation({ waitUntil: "load" });
    console.log("Navigated to Speeches section");

    const currentYear = new Date().getFullYear();

    for (let year = currentYear; year >= 1990; year--) {
      console.log(`Processing year: ${year}`);

      await page.evaluate((year) => {
        const element = document.getElementById(`${year}0`);
        if (element) element.click();
      }, year);

      await page.waitForSelector(".tablebg", { visible: true });

      const scrapedData = await page.evaluate(() => {
        const pdfTable = document.querySelector(".tablebg");
        if (!pdfTable) return [];

        const pdfs = [];
        const rows = pdfTable.querySelectorAll("tr");
        let currentDate = "";

        rows.forEach((row) => {
          const dateHeader = row.querySelector(".tableheader");
          if (dateHeader) {
            currentDate = dateHeader.textContent.trim();
          }

          const link = row.querySelector('td[colspan="3"] a');
          if (link) {
            const title = row.querySelector(".link2").textContent.trim();
            const pdfLink = link.href;
            const pdfSize = row
              .querySelector('td[colspan="3"]')
              .textContent.trim();

            pdfs.push({
              date: currentDate,
              title,
              speechLink: pdfLink,
              pdfLink,
              pdfSize,
            });
          }
        });

        return pdfs;
      });

      const newRecords = scrapedData.filter(
        (item) => !existingDataMap.has(item.pdfLink)
      );
      if (newRecords.length > 0) {
        await Speech.insertMany(newRecords);
        newRecords.forEach((record) =>
          existingDataMap.set(record.pdfLink, true)
        );
        console.log(`Saved ${newRecords.length} new records for year ${year}`);
      } else {
        console.log(`No new records found for year ${year}`);
      }

      allData = allData.concat(newRecords);
    }

    const finalCount = await Speech.countDocuments();
    const addedCount = finalCount - initialCount;
    console.log(`Scraping completed! Total new data: ${allData.length}`);
    console.log(`Final number of documents: ${finalCount}`);
    console.log(`Number of documents added in this run: ${addedCount}`);
  } catch (error) {
    console.error("An error occurred:", error);
  } finally {
    await browser.close();
  }
}
