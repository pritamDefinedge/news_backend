const newsSchema = new Schema({
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"]
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Rejected'],
      default: 'Draft',
      index: true
    },
    posts: [
      {
        content: {
          type: String,
          required: true,
          trim: true
        },
        position: {
          type: Number,
          required: true,
          min: [1, "Position must be at least 1"]
        },
        subAdmin: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
          index: true,
          validate: {
            validator: async function(v) {
              const category = await mongoose.model('Category').findById(this.parent().category);
              return category.assignedSubAdmins.includes(v);
            },
            message: 'This user is not authorized as sub-admin for this category'
          }
        },
        status: {
          type: String,
          enum: ['Draft', 'Published', 'Rejected'],
          default: 'Draft'
        },
        media: {
          type: String, // URL to attached media
          validate: {
            validator: v => /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v),
            message: "Invalid media URL"
          }
        },
        likes: {
          type: Number,
          default: 0,
          min: 0
        }
      }
    ],
    featured: {
      type: Boolean,
      default: false,
      index: true
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  }, { 
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });
  
  // Indexes for better query performance
  newsSchema.index({ title: 'text', content: 'text' });
  newsSchema.index({ 'posts.subAdmin': 1 });
  newsSchema.index({ 'posts.position': 1 });
  newsSchema.index({ createdAt: -1 });
  
  // Virtual for comments (if you need them later)
//   newsSchema.virtual('comments', {
//     ref: 'Comment',
//     localField: '_id',
//     foreignField: 'news'
//   });
  
  // Middleware to validate positions are unique per news
  newsSchema.pre('save', async function(next) {
    if (this.isModified('posts')) {
      const positions = this.posts.map(p => p.position);
      if (new Set(positions).size !== positions.length) {
        return next(new Error('Post positions must be unique within a news item'));
      }
    }
    next();
  });
  
  const News = model("News", newsSchema);