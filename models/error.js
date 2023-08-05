import mongoose from "mongoose";

const Schema = mongoose.Schema;

const errorWbSchema = new Schema({
   id: {
      type: Number,
   },
   potok: {
      type: Number,
   },
});

export const Error = mongoose.model("Error", errorWbSchema);
