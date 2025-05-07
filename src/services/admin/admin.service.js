import { Admin } from "../../models/admin.model.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";
import { ApiError } from "../../utils/ApiError.js";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import { generateAdminAccessAndRefreshTokens } from "../../utils/tokenUtils.js";

// Helper function to check for email or phone uniqueness
const checkUniqueFields = async (email, phone, excludeId = null) => {
  const emailExists = await Admin.findOne({ email, _id: { $ne: excludeId } });
  if (emailExists) {
    throw new ApiError(httpStatus.CONFLICT, "Email is already taken");
  }
  const phoneExists = await Admin.findOne({ phone, _id: { $ne: excludeId } });
  if (phoneExists) {
    throw new ApiError(httpStatus.CONFLICT, "Phone number is already taken");
  }
};

const createAdmin = async (
  req,
  avatarLocalPath,
  aadharFrontImageLocalPath,
  aadharBackImageLocalPath,
  panImageLocalPath
) => {
  const {
    name,
    email,
    password,
    phone,
    secondaryPhone,
    aadharNumber,
    panNumber,
    gst,
    firmType,
    roleId,
    firmName,
    firmAddress,
    bankDetails,
    composition,
    partnerDetails,
  } = req.body;
  const addedBy = req?.user?._id ?? null;

  // Check if email or phone already exists
  await checkUniqueFields(email, phone);

  // Upload images to Cloudinary
  const avatar = avatarLocalPath
    ? await uploadOnCloudinary(avatarLocalPath)
    : null;
  const aadharFrontImage = aadharFrontImageLocalPath
    ? await uploadOnCloudinary(aadharFrontImageLocalPath)
    : null;
  const aadharBackImage = aadharBackImageLocalPath
    ? await uploadOnCloudinary(aadharBackImageLocalPath)
    : null;
  const panImage = panImageLocalPath
    ? await uploadOnCloudinary(panImageLocalPath)
    : null;

  // Ensure uploads were successful
  if (avatarLocalPath && !avatar?.url)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Error uploading avatar"
    );
  if (aadharFrontImageLocalPath && !aadharFrontImage?.url)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Error uploading Aadhar Front Image"
    );
  if (aadharBackImageLocalPath && !aadharBackImage?.url)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Error uploading Aadhar Back Image"
    );
  if (panImageLocalPath && !panImage?.url)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Error uploading Pan Card Image"
    );

  // Initialize admin data object
  const adminData = {
    name,
    email,
    password,
    phone,
    secondaryPhone,
    roleId,
    aadharNumber,
    panNumber,
    gst,
    firmType,
    firmName,
    firmAddress,
    composition,
    avatar: avatar?.url || "default.png",
    document: req.body.document || [],
    addedBy,
  };

  const newAdmin = new Admin(adminData);
  return await newAdmin.save();
};

// Function to fetch all Admins (excluding deleted)
const getAllAdmins = async () => {
  return await Admin.find().populate("roleId"); // Middleware automatically filters deleted admins
};

// Function to fetch all active Admins (excluding deleted or blocked)
const getAllActiveAdmins = async () => {
  return await Admin.find({ status: "Active" }).populate("roleId"); // Fetch only active Admins, excluding deleted
};

// Function to fetch an Admin by ID (excluding deleted)
const getAdminById = async (id) => {
  const admin = await Admin.findById(id).populate("roleId"); // Populate Store  details if applicable

  // Check if Admin exists
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  return admin;
};

// Function to update an Admin by ID
// Function to update an Admin by ID
const updateAdminById = async (
  id,
  data,
  avatarLocalPath,
  aadharFrontImageLocalPath,
  aadharBackImageLocalPath,
  panImageLocalPath
) => {
  const { name, email, phone, secondaryPhone, aadharNo, panNo, roleId } = data;

  // Check if email or phone already exists (excluding current admin)
  await checkUniqueFields(email, phone, id);

  const updateData = {}; // Initialize an empty object for the fields to be updated

  // Check if avatarLocalPath exists, then upload the new image and update the image URL
  if (avatarLocalPath) {
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (avatar?.url) {
      updateData.avatar = avatar.url; // Add the new avatar URL to updateData
    } else {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Error while uploading avatar"
      );
    }
  }
  // Check if avatarLocalPath exists, then upload the new image and update the image URL
  if (aadharFrontImageLocalPath) {
    const avatar = await uploadOnCloudinary(aadharFrontImageLocalPath);
    if (avatar?.url) {
      updateData.aadharFrontImage = avatar.url; // Add the new avatar URL to updateData
    } else {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Error while uploading Aadhar Front Image"
      );
    }
  }

  if (aadharBackImageLocalPath) {
    const avatar = await uploadOnCloudinary(aadharBackImageLocalPath);
    if (avatar?.url) {
      updateData.aadharBackImage = avatar.url; // Add the new avatar URL to updateData
    } else {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Error while uploading Aadhar Back Image"
      );
    }
  }

  if (panImageLocalPath) {
    const avatar = await uploadOnCloudinary(panImageLocalPath);
    if (avatar?.url) {
      updateData.panImage = avatar.url; // Add the new avatar URL to updateData
    } else {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Error while uploading Aadhar Back Image"
      );
    }
  }

  // Update all other fields if they are provided in the request data
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;
  if (secondaryPhone) updateData.secondaryPhone = secondaryPhone; // Added secondaryPhone
  if (roleId) updateData.roleId = roleId;
  if (aadharNo) updateData.aadharNo = aadharNo; // Assuming you want to update aadharNo
  if (panNo) updateData.panNo = panNo; // Assuming you want to update panNo

  // Update the Admin with the new data
  const updatedAdmin = await Admin.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  // Check if the Admin exists and was updated
  if (!updatedAdmin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  return updatedAdmin; // Return the updated document
};

const softDeleteAdminById = async (id) => {
  const admin = await Admin.findById(id);

  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }
  if (admin.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Admin is already deleted");
  }

  admin.isDeleted = true;
  await admin.save();

  return admin;
};

const adminLogin = async (email, password) => {
  // Find the admin by email
  const admin = await Admin.findOne({ email });

  // Check if the admin exists
  if (!admin) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // Verify the password using bcrypt
  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password");
  }

  // Generate access and refresh tokens for the authenticated admin
  const { accessToken, refreshToken } =
    await generateAdminAccessAndRefreshTokens(admin._id);

  const adminData = await Admin.findById(admin._id)
    .populate("roleId")
    .select("-password -refreshToken");

  return {
    ...adminData.toObject(),
    accessToken,
    refreshToken,
  };
};

const adminChangePassword = async (adminId, oldPassword, newPassword) => {
  // Find the admin by ID
  const admin = await Admin.findById(adminId);

  // Check if the admin exists
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  // Verify the old password
  const isOldPasswordValid = await bcrypt.compare(oldPassword, admin.password);
  if (!isOldPasswordValid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Old password is incorrect");
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update the admin's password
  admin.password = hashedPassword;
  await admin.save();

  return { message: "Password updated successfully" };
};

const adminLogout = async (adminId) => {
  // Find the admin by ID
  const admin = await Admin.findById(adminId);

  // Check if the admin exists
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  // Invalidate the refresh token by removing it from the database (or setting it to null)
  admin.refreshToken = null;
  await admin.save();

  return { message: "Logged out successfully" };
};

const changePassword = async (adminId, currentPassword, newPassword) => {
  const admin = await Admin.findById(adminId);
  // Check if the admin exists
  if (!admin || admin.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  // Check if the current password is correct using the schema method
  const isPasswordValid = await admin.isPasswordCorrect(currentPassword);
  if (!isPasswordValid) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Current password is incorrect"
    );
  }

  // Update the admin's password with the new password
  admin.password = newPassword; // The pre-save hook will handle hashing
  await admin.save();

  return admin;
};

// Additional Admin-specific functions can be added here...
export {
  createAdmin,
  getAllAdmins,
  getAllActiveAdmins,
  getAdminById,
  updateAdminById,
  softDeleteAdminById,
  adminLogin,
  adminLogout,
  changePassword,
  adminChangePassword,
};
