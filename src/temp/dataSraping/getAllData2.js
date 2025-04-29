const axios = require("axios");
const cheerio = require("cheerio");

exports.getAllData2 = async (req, res) => {
  try {
    console.log("Hotel Data Scraping started");
    const { hotelurl } = req.query;

    if (!hotelurl) {
      return res.status(400).json({ error: "Missing hotel URL" });
    }

    console.log("Scraping URL:", hotelurl);

    // Ensure JavaScript is rendered to load dynamic content
    const params = {
      api_key: process.env.SCRAPINGBEE_API_KEY,
      url: hotelurl,
      block_resources: false,
      premium_proxy: true,
      stealth_proxy: true,
      json_response: true,
      render_js: true,
      js_scenario: JSON.stringify({
        instructions: [
          { click: "button[data-stid='reviews-link']" },
          { wait: 2000 }, // Wait for content to load after click
        ],
      }),
    };

    console.log("Sending request to ScrapingBee...");

    const response = await axios.get(process.env.SCRAPINGBEE_URL_MAIN, {
      params,
    });

    console.log("Response received with status:", response.status);

    // Cheerio load the HTML content
    const $ = cheerio.load(response.data.body);

    // Extract reviews only after the button click
    const reviews = $('[data-stid="property-reviews-list-item"]')
      .map((i, el) => {
        const ratingValue = $(el).find('[itemprop="ratingValue"]').text().trim();
        const description = $(el).find('[itemprop="description"]').text().trim();
        const datePublished = $(el).find('[itemprop="datePublished"]').text().trim();
        const author = $(el).find('[itemprop="author"]').text().trim();

        return { ratingValue, description, datePublished, author };
      })
      .get();

    console.log(`Extracted ${reviews.length} reviews using ScrapingBee`);

    // Return the reviews data
    res.status(200).json({
      message: "Hotel reviews scraped successfully",
      reviews,
    });
  } catch (error) {
    console.error("Error fetching hotel reviews:", error.message);

    // Return a detailed error response
    res.status(500).json({
      error: "Hotel reviews scraping failed",
      details: error.message,
    });
  }
};
