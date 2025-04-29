const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client } = require("@aws-sdk/client-s3");

// Configure AWS S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Set up multer to use multer-s3 for direct uploads to S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      cb(null, `temp/${Date.now()}_${file.originalname}`);
    },
  }),

  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|pdf/; // Allowed file types
    const mimetypes = /image\/jpeg|image\/jpg|image\/png|image\/gif|image\/webp|application\/pdf/;
    const extname = filetypes.test(file.originalname.split(".").pop().toLowerCase());
    const mimetype = mimetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      // Extract the file extension
      const fileExtension = file.originalname.split(".").pop();
      cb(new Error(`Error: File type not supported! Received file extension: .${fileExtension}`));
    }
  },

  limits: { fileSize: 10 * 1024 * 1024 }, // Limit to 10 MB
}).array("files", 10); // Accept up to 10 files

exports.tempFileUpload = async (req, res) => {
  try {
    upload(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err); // Log the specific error
        return res.status(400).json({
          success: false,
          message: "Error uploading files: " + err.message,
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files were uploaded. Please select at least one file.",
        });
      }

      // Map through the uploaded files to get their locations
      const fileLinks = req.files.map((file) => file.location); // `file.location` contains the S3 URL

      return res.status(200).json({
        success: true,
        message: "Files uploaded successfully",
        data: fileLinks,
      });
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading files: " + error.message,
    });
  }
};
