import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const { Schema, model } = mongoose;

const categorySchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Category title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters long"],
      maxlength: [100, "Title cannot exceed 100 characters"],
      unique: true,
      index: true
    },
    slug: {
      type: String,
      unique: true,
      index: true
    },
    image: {
      type: String,
      required: [true, "Category image is required"],
      validate: {
        validator: function (v) {
          return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
        },
        message: "Please provide a valid image URL"
      }
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Author",
      default:null
    },
    postCount: {
      type: Number,
      default: 0
    },
    order: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for news in this category
categorySchema.virtual("news", {
  ref: "News",
  localField: "_id",
  foreignField: "category"
});

// Indexes
categorySchema.index({ title: "text" }); // Removed 'description' as it's not in the schema

// Pre-save middleware
categorySchema.pre("save", async function (next) {
  try {
    // Capitalize title
    if (this.isModified("title")) {
      this.title = this.title.charAt(0).toUpperCase() + this.title.slice(1);
    }

    // Generate slug from title
    if (this.isModified("title")) {
      this.slug = this.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Static method to get categories with news count
categorySchema.statics.getCategoriesWithNewsCount = async function () {
  return this.aggregate([
    {
      $lookup: {
        from: "news",
        localField: "_id",
        foreignField: "category",
        as: "newsItems"
      }
    },
    {
      $addFields: {
        newsCount: { $size: "$newsItems" }
      }
    },
    {
      $project: {
        newsItems: 0
      }
    },
    {
      $sort: { order: 1 }
    }
  ]);
};

const Category = model("Category", categorySchema);

export default Category;
