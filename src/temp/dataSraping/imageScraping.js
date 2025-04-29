const axios = require("axios");
const cheerio = require("cheerio");

exports.scrapeImage = async (req, res) => {
  try {
    console.log("Iamge Scraping started");
    const { hotelurl } = req.query;

    const params = {
      api_key: process.env.SCRAPINGBEE_API_KEY,
      url: hotelurl,
      block_resources: false,
      premium_proxy: true,
      stealth_proxy: true,
      json_response: true,
      render_js: true,
      js_scenario: JSON.stringify({
        instructions: [{ click: "#Overview" }, { wait: 3000 }],
      }),
    };

    const response = await axios.get(process.env.SCRAPINGBEE_URL_MAIN, {
      params,
    });

    //cheerio
    const $ = cheerio.load(response.data.body);
    const microdata = response.data.metadata?.microdata[0];
    const hotelId = microdata?.identifier;

    console.log("hotelId", hotelId);

    // Get all img src attributes
    const imgSrcs = [];
    $("img").each((i, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (
        src &&
        src.includes(hotelId.toString()) &&
        src.includes("https://") &&
        src.includes(".jpg")
      ) {
        const url = src.split("?")[0];
        imgSrcs.push(url);
        // imgSrcs.push(src);
      }
    });

    const uniqueImages = [...new Set(imgSrcs)];

    const Iamges = {
      uniqueImages,
      total: uniqueImages?.length,
    };

    res.status(200).json({
      message: "Data scraped successfully",
      data: {
        Iamges,
        // data: responseData,
      },
    });
  } catch (error) {
    console.error("Error fetching page:", error.message);
    console.error(
      "Response data:",
      error.response ? error.response.data : "No response data"
    );
  }
};
