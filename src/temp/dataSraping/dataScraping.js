const axios = require("axios");
const cheerio = require("cheerio");

exports.scrapeData = async (req, res) => {
  try {
    console.log("Data Scraping started");
    const { hotelurl } = req.query;

    if (!hotelurl) {
      return res.status(400).json({ error: "Missing hotel URL" });
    }

    // Using a simpler js_scenario format that ScrapingBee supports
    const params = {
      api_key: process.env.SCRAPINGBEE_API_KEY,
      url: hotelurl,
      block_resources: false,
      premium_proxy: true,
      stealth_proxy: true,
      json_response: true,
      render_js: true,
      // Simplify the js_scenario to use basic click actions
      js_scenario: JSON.stringify({
        instructions: [
          // Try clicking buttons with specific texts (one at a time)
          { click: "button:contains('See all')" },
          { wait: 1000 },
          { click: "button:contains('All amenities')" },
          { wait: 1000 },
          { click: "button:contains('Show more')" },
          { wait: 1000 },
          { click: "button:contains('All property')" },
          { wait: 1000 },
        ],
      }),
    };

    console.log("Sending request with params");

    const response = await axios.get(process.env.SCRAPINGBEE_URL_MAIN, {
      params,
    });

    // Cheerio load the HTML content
    const $ = cheerio.load(response.data.body);

    // Create an object to store all hotel information
    const hotelInfo = {
      name: "",
      address: "",
      rating: "",
      amenities: {
        general: [],
        internet: [],
        parking: [],
        food: [],
        wellness: [],
        accessibility: [],
      },
      rooms: [],
      description: "",
    };

    // Extract hotel name and basic info
    hotelInfo.name = $("h1").first().text().trim();
    hotelInfo.description = $('div[itemprop="description"]').text().trim();

    // Try to extract the address
    $('[data-stid="content-hotel-address"]').each((i, el) => {
      hotelInfo.address = $(el).text().trim();
    });

    // Extract amenities using multiple approaches to maximize success rate

    // Approach 1: Look for common amenities section selectors
    $(
      '[data-stid="content-hotel-amenities"], [data-stid="section-room-amenities"]'
    )
      .find("li, div.uitk-text")
      .each((i, el) => {
        const text = $(el).text().trim();
        if (text && !text.includes("See all") && text.length > 1) {
          categorizeAmenity(text, hotelInfo.amenities);
        }
      });

    // Approach 2: Look for heading + list pattern
    $("h3, h2").each((i, el) => {
      const heading = $(el).text().trim().toLowerCase();
      if (
        heading.includes("amenities") ||
        heading.includes("property") ||
        heading.includes("internet") ||
        heading.includes("parking") ||
        heading.includes("services")
      ) {
        // Get the parent section and then look for list items or text elements
        const $parent = $(el).parent().parent();
        $parent
          .find('li, div.uitk-text, div[role="listitem"]')
          .each((j, listItem) => {
            const text = $(listItem).text().trim();
            if (text && text.length > 1 && !text.includes("See all")) {
              categorizeAmenity(text, hotelInfo.amenities);
            }
          });
      }
    });

    // Approach 3: Find any lists or divs that might contain amenities by looking for keywords
    $("li, div").each((i, el) => {
      const text = $(el).text().trim();
      if (
        text &&
        text.length > 5 &&
        text.length < 100 &&
        isLikelyAmenity(text)
      ) {
        categorizeAmenity(text, hotelInfo.amenities);
      }
    });

    // Clean up the amenities by removing duplicates
    Object.keys(hotelInfo.amenities).forEach((category) => {
      hotelInfo.amenities[category] = [
        ...new Set(hotelInfo.amenities[category]),
      ];
    });

    // Extract metadata if available
    const microdata = response.data.metadata?.microdata?.[0] || {};
    hotelInfo.hotelId = microdata?.identifier || "";

    console.log("Hotel name:", hotelInfo.name);
    console.log(
      "Amenities found:",
      Object.values(hotelInfo.amenities).reduce(
        (total, arr) => total + arr.length,
        0
      )
    );

    res.status(200).json({
      message: "Data scraped successfully",
      data: hotelInfo,
    });
  } catch (error) {
    console.error("Error fetching page:", error.message);
    console.error(
      "Response data:",
      error.response ? error.response.data : "No response data"
    );

    // Return a more detailed error response
    res.status(500).json({
      error: "Scraping failed",
      details: error.message,
      responseData: error.response?.data || null,
    });
  }
};

// Helper function to categorize amenities
function categorizeAmenity(text, amenitiesObj) {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes("wifi") ||
    lowerText.includes("internet") ||
    lowerText.includes("connection")
  ) {
    amenitiesObj.internet.push(text);
  } else if (
    lowerText.includes("parking") ||
    lowerText.includes("garage") ||
    lowerText.includes("valet")
  ) {
    amenitiesObj.parking.push(text);
  } else if (
    lowerText.includes("breakfast") ||
    lowerText.includes("restaurant") ||
    lowerText.includes("bar") ||
    lowerText.includes("food") ||
    lowerText.includes("kitchen") ||
    lowerText.includes("dining")
  ) {
    amenitiesObj.food.push(text);
  } else if (
    lowerText.includes("spa") ||
    lowerText.includes("pool") ||
    lowerText.includes("fitness") ||
    lowerText.includes("gym") ||
    lowerText.includes("sauna") ||
    lowerText.includes("massage")
  ) {
    amenitiesObj.wellness.push(text);
  } else if (
    lowerText.includes("accessible") ||
    lowerText.includes("disability") ||
    lowerText.includes("wheelchair")
  ) {
    amenitiesObj.accessibility.push(text);
  } else {
    amenitiesObj.general.push(text);
  }
}

// Helper function to determine if text is likely an amenity
function isLikelyAmenity(text) {
  const amenityKeywords = [
    "free",
    "wifi",
    "parking",
    "breakfast",
    "pool",
    "gym",
    "fitness",
    "service",
    "internet",
    "air conditioning",
    "restaurant",
    "bar",
    "shuttle",
    "laundry",
    "cleaning",
    "spa",
    "accessible",
    "tv",
    "coffee",
    "tea",
    "room service",
    "minibar",
    "safe",
    "hair dryer",
  ];

  const lowerText = text.toLowerCase();
  return amenityKeywords.some((keyword) => lowerText.includes(keyword));
}
