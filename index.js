import cron from "node-cron";
import { connectDB } from "./db.js";
import { scrapeRbiSpeeches } from "./scraper.js";

(async function main() {
  try {
    await connectDB();

    // Immediately when the program starts
    await scrapeRbiSpeeches();

    // Run every day at 5:17 AM
    cron.schedule("5 * * * *", async () => {
      console.log("Starting scheduled scraping task...");
      try {
        await scrapeRbiSpeeches();
      } catch (error) {
        console.error("Error in scheduled scraping:", error);
      }
    });
  } catch (error) {
    console.error("An error occurred in the main process:", error);
  }
})();
