import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
import logger from "./logger.js";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        // Validate input
        if (!localFilePath) {
            logger.warn('No file path provided for Cloudinary upload');
            return null;
        }

        // Verify file exists before attempting upload
        if (!fs.existsSync(localFilePath)) {
            logger.error(`File not found at path: ${localFilePath}`);
            return null;
        }

        logger.info(`Starting Cloudinary upload for file: ${localFilePath}`);

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder: "category_images",  // Optional: Organize in Cloudinary folder
            use_filename: true,         // Keep original filename
            unique_filename: false,     // Allow overwrites
            overwrite: true            // Overwrite if same filename
        });

        logger.info(`File uploaded successfully to Cloudinary: ${response.url}`);

        // Clean up local temp file
        try {
            fs.unlinkSync(localFilePath);
            logger.info(`Local temp file deleted: ${localFilePath}`);
        } catch (unlinkError) {
            logger.error(`Error deleting local temp file: ${unlinkError.message}`);
            // Continue even if temp file deletion fails
        }

        return response;

    } catch (error) {
        logger.error(`Cloudinary upload failed: ${error.message}`);

        // Attempt to clean up local temp file even if upload failed
        try {
            if (fs.existsSync(localFilePath)) {
                fs.unlinkSync(localFilePath);
                logger.info(`Cleaned up local temp file after failed upload: ${localFilePath}`);
            }
        } catch (unlinkError) {
            logger.error(`Error cleaning up temp file after failed upload: ${unlinkError.message}`);
        }

        return null;
    }
};

const deleteFromCloudinary = async (fileUrl) => {
    try {
        if (!fileUrl) return;
        
        console.log("Attempting to delete file from Cloudinary:", fileUrl);
        
        // Extract public ID (works for most Cloudinary URL formats)
        const urlParts = fileUrl.split('/');
        const publicIdWithExtension = urlParts.slice(urlParts.indexOf('upload') + 2).join('/');
        const publicId = publicIdWithExtension.split('.')[0];
        
        console.log("Extracted publicId:", publicId);
        
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "image",  // Changed from "raw" to "image"
            invalidate: true         // Optional: CDN cache invalidation
        });
        
        console.log("Cloudinary deletion result:", result);
        
        if (result.result !== 'ok') {
            throw new Error(`Cloudinary deletion failed: ${result.result}`);
        }
        
        return true;
    } catch (error) {
        console.error('Error deleting file from Cloudinary:', error);
        throw error; // Re-throw to handle in calling function
    }
};

export { uploadOnCloudinary, deleteFromCloudinary }
