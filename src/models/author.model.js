import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";

const authorSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
      match: [
        /^[a-zA-Z\s-']+$/,
        "First name can only contain letters, spaces, hyphens and apostrophes",
      ],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
      match: [
        /^[a-zA-Z\s-']+$/,
        "Last name can only contain letters, spaces, hyphens and apostrophes",
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: validator.isEmail,
        message: "Please provide a valid email address",
      },
      index: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[6-9]\d{9}$/.test(v);
        },
        message: "Please provide a valid 10-digit Indian phone number",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      select: false,
    },
    avatar: {
      type: String,
      default: "",
      validate: {
        validator: validator.isURL,
        message: "Avatar must be a valid URL",
      },
    },
    coverImage: {
      type: String,
      default: "",
      validate: {
        validator: validator.isURL,
        message: "Cover image must be a valid URL",
      },
    },
    role: {
      type: String,
      enum: ["author", "admin"],
      default: "author",
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    socialLinks: {
      facebook: {
        type: String,
        validate: {
          validator: validator.isURL,
          message: "Facebook link must be a valid URL",
        },
      },
      twitter: {
        type: String,
        validate: {
          validator: validator.isURL,
          message: "Twitter link must be a valid URL",
        },
      },
      instagram: {
        type: String,
        validate: {
          validator: validator.isURL,
          message: "Instagram link must be a valid URL",
        },
      },
      linkedin: {
        type: String,
        validate: {
          validator: validator.isURL,
          message: "LinkedIn link must be a valid URL",
        },
      },
    },
    loginHistory: [
      {
        device: String,
        ipAddress: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    loginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    lastActive: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
  }
);

// Virtuals
authorSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Indexes
authorSchema.index({ isActive: 1, isVerified: 1 });

// Middleware
authorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = Date.now();
    next();
  } catch (error) {
    next(error);
  }
});

// Instance Methods
authorSchema.methods = {
  generateAccessToken: function () {
    return jwt.sign(
      {
        _id: this._id,
        email: this.email,
        role: this.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
  },

  generateRefreshToken: function () {
    return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
  },

  comparePassword: async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  },

  changedPasswordAfter: function (JWTTimestamp) {
    if (this.passwordChangedAt) {
      const changedTimestamp = parseInt(
        this.passwordChangedAt.getTime() / 1000,
        10
      );
      return JWTTimestamp < changedTimestamp;
    }
    return false;
  },


  recordLogin: function (deviceInfo, ipAddress) {
    this.loginHistory.push({
      device:
        typeof deviceInfo === "string"
          ? deviceInfo
          : JSON.stringify(deviceInfo),
      ipAddress,
    });
    this.lastActive = Date.now();
    return this.save();
  },

  isAccountLocked: function () {
    return this.lockUntil && this.lockUntil > Date.now();
  },

  incrementLoginAttempts: async function () {
    if (this.isAccountLocked()) return this;

    const updates = { $inc: { loginAttempts: 1 } };

    if (this.loginAttempts + 1 >= process.env.MAX_LOGIN_ATTEMPTS || 5) {
      updates.$set = {
        lockUntil: Date.now() + process.env.LOCK_TIME || 2 * 60 * 60 * 1000,
      };
    }

    return this.updateOne(updates);
  },

  resetLoginAttempts: function () {
    return this.updateOne({
      $set: { loginAttempts: 0, lockUntil: null },
    });
  },
};

// Static Methods
authorSchema.statics.findByCredentials = async function (email, password) {
  const author = await this.findOne({ email, isActive: true }).select(
    "+password +loginAttempts +lockUntil"
  );

  if (!author || (await author.isAccountLocked())) return null;

  const isMatch = await author.comparePassword(password);
  if (!isMatch) {
    await author.incrementLoginAttempts();
    return null;
  }

  await author.resetLoginAttempts();
  return author;
};

const Author = mongoose.model("Author", authorSchema);
export default Author;
