const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const roadSessionSchema = new Schema({
  username: { type: String },
  age: { type: Number, required: true },
  isEnded: { type: Boolean },
  vehicleDetails: { type: Map, of: String },
  weatherDetails: { type: Map, of: String },
});

const RoadSession = mongoose.model("RoadSession", roadSessionSchema);

module.exports = RoadSession;
