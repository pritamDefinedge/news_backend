import jwt from "jsonwebtoken";
import Author from "../models/author.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import logger from "../utils/logger.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    logger.warn("JWT verification failed: No token provided");
    throw new ApiError(401, "Unauthorized - No token provided");
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    logger.info(`JWT decoded for Author ID: ${decodedToken?._id}`);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      logger.warn("JWT expired");
      throw new ApiError(401, "Unauthorized - Token expired");
    } else if (error.name === "JsonWebTokenError") {
      logger.warn("Invalid JWT");
      throw new ApiError(401, "Unauthorized - Invalid token");
    } else {
      logger.error("JWT verification failed", error);
      throw new ApiError(500, "Token verification failed");
    }
  }

  const author = await Author.findById(decodedToken?._id).select(
    "-password -refreshToken -verificationToken -verificationTokenExpires -passwordResetToken -passwordResetExpires"
  );

  if (!author) {
    logger.warn(`JWT valid but author not found: ${decodedToken?._id}`);
    throw new ApiError(401, "Unauthorized - Author not found");
  }

  if (author.isDeleted) {
    logger.warn(`Access denied: Deleted author ${author._id}`);
    throw new ApiError(401, "Unauthorized - Account has been deleted");
  }

  // if (author.isActive === "Blocked") {
  //   logger.warn(`Access denied: Blocked author ${author._id}`);
  //   throw new ApiError(403, "Forbidden - Account is blocked");
  // }

  // if (author.status === "Pending") {
  //   logger.warn(`Access denied: Pending author ${author._id}`);
  //   throw new ApiError(403, "Forbidden - Account is pending verification");
  // }

  if (typeof author.changedPasswordAfter === "function" && author.changedPasswordAfter(decodedToken.iat)) {
    logger.warn(`Access denied: author ${author._id} changed password after token issuance`);
    throw new ApiError(401, "Unauthorized - Password changed recently. Please login again");
  }

  req.author = author;
  logger.info(`JWT verified and author authorized: ${author._id}`);
  next();
});
