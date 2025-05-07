import mongoose from "mongoose";
import logger from "./logger.js";

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} True if the ID is valid, false otherwise
 */
const validateObjectId = (id) => {
  try {
    if (!id) {
      logger.warn('Empty ID provided for validation');
      return false;
    }

    const isValid = mongoose.Types.ObjectId.isValid(id);
    
    if (!isValid) {
      logger.warn(`Invalid ObjectId format: ${id}`);
    }
    
    return isValid;
  } catch (error) {
    logger.error(`Error validating ObjectId: ${error.message}`);
    return false;
  }
};

export { validateObjectId }; 