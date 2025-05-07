import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from "../utils/ApiError.js";

// Define allowed file types
const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/ogg'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024, // 5MB
  video: 50 * 1024 * 1024, // 50MB
  document: 10 * 1024 * 1024 // 10MB
};

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // console.log("files",file);
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        // Generate a unique identifier (UUID) for the new file name
        const uniqueId = uuidv4();
        const fileExtension = path.extname(file.originalname).toLowerCase();
        const newFileName = `${uniqueId}${fileExtension}`;
        cb(null, newFileName);
    }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Check if file type is allowed
  const isAllowedType = Object.values(ALLOWED_FILE_TYPES).some(types => 
    types.includes(file.mimetype)
  );

  if (!isAllowedType) {
    return cb(new ApiError(400, `File type not allowed. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`), false);
  }

  // Check file size based on type
  const fileType = Object.keys(ALLOWED_FILE_TYPES).find(type => 
    ALLOWED_FILE_TYPES[type].includes(file.mimetype)
  );
  
  if (file.size > FILE_SIZE_LIMITS[fileType]) {
    return cb(new ApiError(400, `File size exceeds limit. Maximum size for ${fileType}: ${FILE_SIZE_LIMITS[fileType] / (1024 * 1024)}MB`), false);
  }

  cb(null, true);
};

// Multer upload configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Math.max(...Object.values(FILE_SIZE_LIMITS)), // Use the largest size limit
    files: 5 // Maximum number of files
  }
});

// Error handling middleware for multer
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds the limit'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next(err);
};
