import Joi from "joi";
import httpStatus from "http-status";
import pick from "../utils/pick.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Middleware function that validates user requests against a Joi schema
 * @param {Object} schema - The Joi schema to validate against
 * @param {Object} schema.params - Schema for request parameters
 * @param {Object} schema.query - Schema for query parameters
 * @param {Object} schema.body - Schema for request body
 * @returns {Function} Express middleware function
 */
const validate = (schema) => (req, res, next) => {
  try {
    // Validate content type for non-GET requests
    if (req.method !== 'GET' && Object.keys(req.body).length !== 0) {
      const contentType = req.headers['content-type'];
      if (!contentType || (!contentType.includes('application/json') && !contentType.includes('multipart/form-data'))) {
        throw new ApiError(
          httpStatus.UNSUPPORTED_MEDIA_TYPE,
          "Content-Type must be application/json or multipart/form-data"
        );
      }
    }

    // Pick schema and request object fields
    const validSchema = pick(schema, ["params", "query", "body"]);
    const object = pick(req, Object.keys(validSchema));

    // Skip validation if schema is empty
    if (Object.keys(validSchema).length === 0) {
      return next();
    }

    // Compile schema and validate
    const { value, error } = Joi.compile(validSchema)
      .prefs({
        errors: { 
          label: "key",
          wrap: { label: false }
        },
        abortEarly: false // Return all errors
      })
      .validate(object, {
        stripUnknown: true, // Remove unknown fields
        convert: true // Convert types when possible
      });

    if (error) {
      // Format error messages
      const errorMessage = error.details
        .map((detail) => {
          const path = detail.path.join('.');
          return `${path}: ${detail.message}`;
        })
        .join(', ');

      throw new ApiError(httpStatus.BAD_REQUEST, errorMessage);
    }

    // Update request with validated values
    Object.assign(req, value);

    return next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }
    return next(new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Validation error occurred"
    ));
  }
};

export default validate;