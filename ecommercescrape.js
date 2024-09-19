import puppeteer from "puppeteer";

async function scrapeAmazonProduct(url) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for the product title selector to load
    await page.waitForSelector("#productTitle");

    // Scrape product details
    const productDetails = await page.evaluate(() => {
      const title =
        document.querySelector("#productTitle")?.innerText.trim() || "N/A";
      const price =
        document
          .querySelector('.a-price span[aria-hidden="true"]')
          ?.innerText.trim() || "N/A";
      const rating =
        document.querySelector("span.a-icon-alt")?.innerText.trim() || "N/A";
      const reviews =
        document.querySelector("#acrCustomerReviewText")?.innerText.trim() ||
        "N/A";

      return {
        title,
        price,
        rating,
        reviews,
      };
    });

    console.log("Product Details:", productDetails);
    return productDetails;
  } catch (error) {
    console.error("Error scraping Amazon product:", error);
  } finally {
    await browser.close();
  }
}

// Example usage
const amazonProductUrl = "https://www.amazon.com/dp/B08N5WRWNW"; // Replace with an actual product URL
scrapeAmazonProduct(amazonProductUrl);
