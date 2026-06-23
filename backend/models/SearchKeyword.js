import mongoose from 'mongoose';

const searchKeywordSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    count: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

const SearchKeyword = mongoose.model('SearchKeyword', searchKeywordSchema);

export default SearchKeyword;
