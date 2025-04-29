const axios = require("axios");
const cheerio = require("cheerio");

exports.getAllData = async (req, res) => {
  try {
    console.log("Hotel Data Scraping started");
    const { hotelurl } = req.query;

    if (!hotelurl) {
      return res.status(400).json({ error: "Missing hotel URL" });
    }

    // Using a comprehensive js_scenario to expand all possible content sections
    const params = {
      api_key: process.env.SCRAPINGBEE_API_KEY,
      url: hotelurl,
      block_resources: false,
      premium_proxy: true,
      stealth_proxy: true,
      json_response: true,
      render_js: true,
      // Expand all sections to get complete data
      js_scenario: JSON.stringify({
        instructions: [
          // Click buttons that might reveal more amenities or property details
          { click: "button[data-stid='reviews-link']" },
          { wait: 2000 },
          { click: "button:contains('See all about this property')" },
          { wait: 1000 },
          { click: "button:contains('All amenities')" },
          { wait: 1000 },
          { click: "button:contains('Show more')" },
          { wait: 1000 },
          { click: "button:contains('All property')" },
          { wait: 1000 },
          // Expand room information
          { click: "button:contains('More details')" },
          { wait: 1000 },
          // Expand policies
          { click: "button:contains('See all policies')" },
          { wait: 1000 },
        ],
      }),
    };

    const response = await axios.get(process.env.SCRAPINGBEE_URL_MAIN, {
      params,
    });

    // Cheerio load the HTML content
    const $ = cheerio.load(response.data.body);

    // Extract metadata if available (important for hotel ID)
    const microdata = response.data.metadata?.microdata?.[0] || {};
    const hotelId = microdata?.identifier || "";

    //get data from meta tags
    const keywordsContent = $('meta[name="keywords"]').attr("content") || "";
    const keywordsArray = keywordsContent.split(",").map((k) => k.trim() || []);

    console.log("Hotel ID extracted:", hotelId);

    // Create a comprehensive object to store all hotel information
    const hotelData = {
      basic: {
        hotelId,
        name: "",
        address: {
          city: "",
          country: "",
        },
        stars: "",
        rating: {
          ratingValue: "",
          description: "",
          bestRating: "",
          reviewCount: "",
          reviews: [],
        },
        checkIn: "",
        checkOut: "",
        description: "",
        coordinates: {
          latitude: "",
          longitude: "",
        },
      },
      images: [],
      amenities: {
        general: [],
        internet: [],
        parking: [],
        dining: [],
        wellness: [],
        accessibility: [],
        services: [],
        business: [],
        family: [],
      },
      rooms: [],
      policies: {
        general: [],
        checkIn: [],
        checkOut: [],
        payment: [],
        pets: [],
        children: [],
      },
      location: {
        address: {},
        nearbyAttractions: [],
        transportOptions: [],
        coordinates: {},
      },
      keywords: keywordsArray,
    };

    // SECTION 1: Extract basic hotel information
    hotelData.basic.name = $("h1").first().text().trim();
    hotelData.basic.description =
      $('div[itemprop="description"]').text().trim() || $('div[data-stid="content-hotel-description"]').text().trim();

    // Try multiple ways to get address
    $('[data-stid="content-hotel-address"]').each((i, el) => {
      hotelData.basic.address = { addrss: $(el).text().trim() };
    });
    if (!hotelData.basic.address) {
      $('div[itemprop="address"]').each((i, el) => {
        hotelData.basic.address = { address: $(el).text().trim() };
      });
    }
    const city = $('[itemprop="city"]').attr("content") || "";
    const state = $('[itemprop="state"]').attr("content") || "";
    const country = $('[itemprop="country"]').attr("content") || "";

    const website = $('[itemprop="website"]').attr("content") || "";
    const email = $('[itemprop="email"]').attr("content") || "";
    const contactNumber = $('[itemprop="contact number"]').attr("content") || "";

    // Extract star rating
    hotelData.basic.stars = $('meta[itemprop="ratingValue"]').attr("content") || "";

    // Extract check-in/out times
    $("div").each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes("Check-in time")) {
        hotelData.basic.checkIn = text.replace("Check-in time", "").trim();
      }
      if (text.includes("Check-out time")) {
        hotelData.basic.checkOut = text.replace("Check-out time", "").trim();
      }
    });

    // SECTION 2: Extract hotel images
    const imgSrcs = [];
    $("img").each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (
        src &&
        ((hotelId && src.includes(hotelId.toString())) || src.includes("hotels") || src.includes("property")) &&
        src.includes("https://") &&
        src.includes(".jpg")
      ) {
        // Clean the URL by removing query parameters
        const url = src.split("?")[0];
        imgSrcs.push(url);
      }
    });

    const uniqueImages = [...new Set(imgSrcs)];

    hotelData.images = {
      uniqueImages,
      total: uniqueImages?.length,
    };

    // SECTION 3: Extract amenities using multiple approaches

    // Approach 1: Look for common amenities section selectors
    $('[data-stid="content-hotel-amenities"], [data-stid="section-room-amenities"]')
      .find("li, div.uitk-text")
      .each((i, el) => {
        const text = $(el).text().trim();
        if (text && !text.includes("See all") && text.length > 1) {
          categorizeAmenity(text, hotelData.amenities);
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
        heading.includes("facilities") ||
        heading.includes("services")
      ) {
        // Get the parent section and then look for list items or text elements
        const $parent = $(el).parent().parent();
        $parent.find('li, div.uitk-text, div[role="listitem"]').each((j, listItem) => {
          const text = $(listItem).text().trim();
          if (text && text.length > 1 && !text.includes("See all")) {
            categorizeAmenity(text, hotelData.amenities);
          }
        });
      }
    });

    // Approach 3: Scan for amenity-like text
    $("li, div").each((i, el) => {
      const text = $(el).text().trim();
      if (text && text.length > 5 && text.length < 100 && isLikelyAmenity(text)) {
        categorizeAmenity(text, hotelData.amenities);
      }
    });

    // Remove duplicates from all amenity categories
    Object.keys(hotelData.amenities).forEach((category) => {
      hotelData.amenities[category] = [...new Set(hotelData.amenities[category])];
    });

    // SECTION 4: Extract room information
    $(".uitk-card").each((i, el) => {
      const roomName = $(el).find("h3").text().trim();
      const roomDetails = $(el)
        .find("li, div.uitk-text")
        .map((i, detail) => $(detail).text().trim())
        .get();
      const roomPrice = $(el).find(".uitk-text-price").text().trim();

      if (roomName && (roomDetails.length > 0 || roomPrice)) {
        hotelData.rooms.push({
          name: roomName,
          details: roomDetails.filter((item) => item.length > 1),
          price: roomPrice,
        });
      }
    });

    // Alternative room extraction method
    if (hotelData.rooms.length === 0) {
      $('[data-stid="section-room-list"]')
        .find(".uitk-card")
        .each((i, el) => {
          const roomName = $(el).find("h3").text().trim();
          const roomDetails = $(el)
            .find("li, div.uitk-text")
            .map((i, detail) => $(detail).text().trim())
            .get();

          if (roomName && roomDetails.length > 0) {
            hotelData.rooms.push({
              name: roomName,
              details: roomDetails.filter((item) => item.length > 1),
            });
          }
        });
    }

    // SECTION 5: Extract policies
    $("h3, h2").each((i, el) => {
      const heading = $(el).text().trim().toLowerCase();
      if (heading.includes("policies") || heading.includes("important information") || heading.includes("rules")) {
        const $parent = $(el).parent().parent();
        $parent.find("li, div.uitk-text").each((j, listItem) => {
          const text = $(listItem).text().trim();
          if (text && text.length > 1) {
            categorizePolicies(text, hotelData.policies);
          }
        });
      }
    });

    // Remove duplicates from policies
    Object.keys(hotelData.policies).forEach((category) => {
      hotelData.policies[category] = [...new Set(hotelData.policies[category])];
    });

    // SECTION 6: Extract location information
    // Copy address from basic info
    hotelData.location.address = { ...hotelData.basic.address };

    // Extract map coordinates if available
    $('[data-stid="content-hotel-map"]').each((i, el) => {
      const mapUrl = $(el).find("a").attr("href") || "";
      const latMatch = mapUrl.match(/lat=([\d.-]+)/);
      const lonMatch = mapUrl.match(/lon=([\d.-]+)/);

      if (latMatch && latMatch[1]) {
        hotelData.location.coordinates.latitude = latMatch[1];
        hotelData.basic.coordinates.latitude = latMatch[1];
      }
      if (lonMatch && lonMatch[1]) {
        hotelData.location.coordinates.longitude = lonMatch[1];
        hotelData.basic.coordinates.longitude = lonMatch[1];
      }
    });

    // Extract nearby attractions
    $("h3, h2").each((i, el) => {
      const heading = $(el).text().trim().toLowerCase();
      if (heading.includes("nearby") || heading.includes("location") || heading.includes("attractions")) {
        const $parent = $(el).parent().parent();
        $parent.find("li, div.uitk-text").each((j, listItem) => {
          const text = $(listItem).text().trim();
          if (text && text.length > 1 && !isLikelyPolicy(text)) {
            hotelData.location.nearbyAttractions.push(text);
          }
        });
      }
    });

    // Extract guest rating information
    const aggregateRatingDiv = $('[itemprop="aggregateRating"][itemscope]');

    if (aggregateRatingDiv.length) {
      hotelData.basic.rating = {
        ratingValue: aggregateRatingDiv.find('[itemprop="ratingValue"]').attr("content") || "",
        description: aggregateRatingDiv.find('[itemprop="description"]').attr("content") || "",
        bestRating: aggregateRatingDiv.find('[itemprop="bestRating"]').attr("content") || "",
        reviewCount: aggregateRatingDiv.find('[itemprop="reviewCount"]').attr("content") || "",
        reviews: [],
      };
    }

    // SECTION 7: Extract reviews using Puppeteer for better results
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

    hotelData.basic.rating.reviews = reviews;

    // Remove duplicates from nearby attractions
    hotelData.location.nearbyAttractions = [...new Set(hotelData.location.nearbyAttractions)];

    hotelData.basic.coordinates.latitude = microdata.latitude;
    hotelData.basic.coordinates.longitude = microdata.longitude;

    hotelData.basic.address = { ...microdata.address };
    hotelData.basic.address.city = city || "";
    hotelData.basic.address.state = state || "";
    hotelData.basic.address.country = country || "";

    hotelData.basic.website = website || "";
    hotelData.basic.email = email || "";
    hotelData.basic.contactNumber = contactNumber || "";

    hotelData.keywords = keywordsArray;

    // Return the comprehensive data
    res.status(200).json({
      message: "Hotel data scraped successfully",
      data: hotelData,
    });
  } catch (error) {
    console.error("Error fetching hotel data:", error.message);
    console.error("Response data:", error.response ? error.response.data : "No response data");

    // Return a detailed error response
    res.status(500).json({
      error: "Hotel data scraping failed",
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
    lowerText.includes("connection") ||
    lowerText.includes("broadband")
  ) {
    amenitiesObj.internet.push(text);
  } else if (
    lowerText.includes("parking") ||
    lowerText.includes("garage") ||
    lowerText.includes("valet") ||
    lowerText.includes("car")
  ) {
    amenitiesObj.parking.push(text);
  } else if (
    lowerText.includes("breakfast") ||
    lowerText.includes("restaurant") ||
    lowerText.includes("bar") ||
    lowerText.includes("food") ||
    lowerText.includes("kitchen") ||
    lowerText.includes("dining") ||
    lowerText.includes("meal") ||
    lowerText.includes("cafe")
  ) {
    amenitiesObj.dining.push(text);
  } else if (
    lowerText.includes("spa") ||
    lowerText.includes("pool") ||
    lowerText.includes("fitness") ||
    lowerText.includes("gym") ||
    lowerText.includes("sauna") ||
    lowerText.includes("massage") ||
    lowerText.includes("yoga") ||
    lowerText.includes("wellness")
  ) {
    amenitiesObj.wellness.push(text);
  } else if (
    lowerText.includes("accessible") ||
    lowerText.includes("disability") ||
    lowerText.includes("wheelchair") ||
    lowerText.includes("mobility") ||
    lowerText.includes("hearing") ||
    lowerText.includes("visual")
  ) {
    amenitiesObj.accessibility.push(text);
  } else if (
    lowerText.includes("service") ||
    lowerText.includes("concierge") ||
    lowerText.includes("reception") ||
    lowerText.includes("staff") ||
    lowerText.includes("cleaning") ||
    lowerText.includes("housekeeping") ||
    lowerText.includes("laundry") ||
    lowerText.includes("dry cleaning")
  ) {
    amenitiesObj.services.push(text);
  } else if (
    lowerText.includes("meeting") ||
    lowerText.includes("conference") ||
    lowerText.includes("business") ||
    lowerText.includes("printer") ||
    lowerText.includes("fax")
  ) {
    amenitiesObj.business.push(text);
  } else if (
    lowerText.includes("family") ||
    lowerText.includes("child") ||
    lowerText.includes("kid") ||
    lowerText.includes("baby") ||
    lowerText.includes("babysitting") ||
    lowerText.includes("crib")
  ) {
    amenitiesObj.family.push(text);
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
    "kitchen",
    "washer",
    "dryer",
    "towels",
    "linen",
    "concierge",
    "reception",
    "24-hour",
    "hour",
    "available",
    "included",
  ];

  const lowerText = text.toLowerCase();
  return amenityKeywords.some((keyword) => lowerText.includes(keyword));
}

// Helper function to categorize policies
function categorizePolicies(text, policiesObj) {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("check-in") || lowerText.includes("check in") || lowerText.includes("arrival")) {
    policiesObj.checkIn.push(text);
  } else if (lowerText.includes("check-out") || lowerText.includes("check out") || lowerText.includes("departure")) {
    policiesObj.checkOut.push(text);
  } else if (
    lowerText.includes("payment") ||
    lowerText.includes("credit card") ||
    lowerText.includes("debit card") ||
    lowerText.includes("cash") ||
    lowerText.includes("charge") ||
    lowerText.includes("fee") ||
    lowerText.includes("cost") ||
    lowerText.includes("deposit")
  ) {
    policiesObj.payment.push(text);
  } else if (
    lowerText.includes("pet") ||
    lowerText.includes("dog") ||
    lowerText.includes("cat") ||
    lowerText.includes("animal")
  ) {
    policiesObj.pets.push(text);
  } else if (
    lowerText.includes("child") ||
    lowerText.includes("kid") ||
    lowerText.includes("infant") ||
    lowerText.includes("baby") ||
    lowerText.includes("minor")
  ) {
    policiesObj.children.push(text);
  } else {
    policiesObj.general.push(text);
  }
}

// Helper function to determine if text is likely a policy
function isLikelyPolicy(text) {
  const policyKeywords = [
    "policy",
    "rule",
    "regulation",
    "requirement",
    "must",
    "prohibited",
    "allowed",
    "permitted",
    "check-in",
    "check-out",
    "cancellation",
    "refund",
    "deposit",
    "fee",
    "charge",
    "payment",
    "credit card",
    "identification",
    "ID",
    "passport",
  ];

  const lowerText = text.toLowerCase();
  return policyKeywords.some((keyword) => lowerText.includes(keyword));
}
