import mongoose from 'mongoose';

const mongoURI = "mongodb+srv://soportesqlrcs:iczb6vYfRA7Olbes@cluster0.p9eqmed.mongodb.net/?retryWrites=true&w=majority";
await mongoose.connect(mongoURI);

const Task = mongoose.model("Task", new mongoose.Schema({
  desc: String,
  user: String,
  status: String,
  createdAt: Date
}));

async function fixStatuses() {
  const r1 = await Task.updateMany({ status: "pendiente" }, { $set: { status: "pending" } });
  const r2 = await Task.updateMany({ status: "en curso" }, { $set: { status: "inprogress" } });
  const r3 = await Task.updateMany({ status: "completada" }, { $set: { status: "completed" } });
  console.log("Actualizadas:", r1.modifiedCount, r2.modifiedCount, r3.modifiedCount);
  mongoose.disconnect();
}

await fixStatuses();