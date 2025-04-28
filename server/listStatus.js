import mongoose from 'mongoose';

const mongoURI = "mongodb+srv://soportesqlrcs:iczb6vYfRA7Olbes@cluster0.p9eqmed.mongodb.net/?retryWrites=true&w=majority";
await mongoose.connect(mongoURI);

const Task = mongoose.model("Task", new mongoose.Schema({
  desc: String,
  user: String,
  status: String,
  createdAt: Date
}));

async function listStatuses() {
  const statuses = await Task.distinct("status");
  console.log("Valores únicos de status:", statuses);
  mongoose.disconnect();
}

await listStatuses();