import mongoose from "mongoose";

const Schema = mongoose.Schema;

const sellerWbSchema = new Schema({
   id: {
      type: Number,
   },
   name: {
      type: String,
   },
   fineName: {
      type: String,
   },
   ogrnip: {
      type: String,
   },
   trademark: {
      type: String,
   },
});

export const SellerWb = mongoose.model("sellerWb", sellerWbSchema);
