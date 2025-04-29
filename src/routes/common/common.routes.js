const express = require("express");
const router = express.Router();

// Temp File Upload
const { tempFileUpload } = require("../../utils/file upload/tempFileUpload");
router.post("/tempFileUpload", tempFileUpload);

// Image Upload to S3
// const { imageUploadToS3 } = require("../../utils/file upload/imageUploadToS3");
// router.post("/imageUploadToS3", async (req, res) => {
//   const result = await imageUploadToS3(req.body.tempFileLinks, req.body.folderName, req.body.userId);
//   res.status(200).json(result);
// });

//data scraping route
const { scrapeData } = require("../../temp/dataSraping/dataScraping");
const { scrapeImage } = require("../../temp/dataSraping/imageScraping");
const { scrapeMultiData } = require("../../temp/dataSraping/multipalData");
const { getAllData } = require("../../temp/dataSraping/getAllData");
const { getAllData2 } = require("../../temp/dataSraping/getAllData2");

router.get("/scrapingData", scrapeData);
router.get("/scrapingImage", scrapeImage);
router.get("/scrapingMultiData", scrapeMultiData);
router.get("/getAllData", getAllData);
router.get("/getAllData2", getAllData2);

module.exports = router;
