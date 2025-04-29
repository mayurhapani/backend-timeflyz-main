const {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");

// Configure AWS S3
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// uplode multiple images to s3
const imageUploadToS3 = async (tempFileLinks = [], folderName, Id) => {
  // Extract the bucket name and key from the tempFileLink
  const bucketName = process.env.AWS_S3_BUCKET;
  const uploadedUrls = [];

  try {
    if (tempFileLinks.length > 0) {
      for (const tempFileLink of tempFileLinks) {
        // Parse the full URL to get just the file path
        const url = new URL(tempFileLink);
        const fileName = url.pathname.split("/").pop();

        // Source file path (in temp folder)
        const sourceKey = `temp/${fileName}`;

        // Destination file path (in userId folder)
        const destinationKey = `${folderName}/${Id}/${fileName}`;

        // Set up copy parameters
        const copyParams = {
          Bucket: bucketName,
          CopySource: `${bucketName}/${sourceKey}`,
          Key: destinationKey,
        };

        // Copy the object within S3
        const copyResult = await s3.send(new CopyObjectCommand(copyParams));

        // Set up delete parameters
        const deleteParams = {
          Bucket: bucketName,
          Key: sourceKey,
        };

        if (copyResult) {
          // Delete the original file from the temp folder
          await s3.send(new DeleteObjectCommand(deleteParams));
        }

        // Add to result list
        uploadedUrls.push(`https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${destinationKey}`);
      }
      return uploadedUrls;
    }
  } catch (error) {
    console.error("Error copying or deleting file:", error);
    throw new Error("Error copying or deleting file: " + error.message);
  }
};

// delete all images from s3
const imageDeleteFromS3 = async (folderName, Id) => {
  const bucketName = process.env.AWS_S3_BUCKET;
  const prefix = `${folderName}/${Id}/`; // The simulated folder path

  try {
    const listedObjects = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      })
    );

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      console.log("No files found under folder to delete.");
      return true;
    }

    const deleteParams = {
      Bucket: bucketName,
      Delete: {
        Objects: listedObjects.Contents.map((item) => ({ Key: item.Key })),
      },
    };

    const deleteResult = await s3.send(new DeleteObjectsCommand(deleteParams));
    console.log(`Deleted all files in folder ${prefix}:`, deleteResult);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Error deleting file: " + error.message);
  }
};

// delete single image from s3
const singleImageDeleteFromS3 = async (folderName, Id, fileName) => {
  const bucketName = process.env.AWS_S3_BUCKET;
  const prefix = `${folderName}/${Id}/${fileName}`;

  try {
    const deleteParams = {
      Bucket: bucketName,
      Key: prefix,
    };

    const deleteResult = await s3.send(new DeleteObjectCommand(deleteParams));
    console.log(`Deleted file ${prefix}:`, deleteResult);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    throw new Error("Error deleting file: " + error.message);
  }
};

module.exports = { imageUploadToS3, imageDeleteFromS3, singleImageDeleteFromS3 };
