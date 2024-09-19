import mongoose from "mongoose";

export async function connectDB() {
  await mongoose.connect(
    "mongodb+srv://arpit-singh:mongopassword@cluster0.rztol.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );
  console.log("Connected to MongoDB");
}

const speechSchema = new mongoose.Schema({
  date: String,
  title: String,
  speechLink: String,
  pdfLink: String,
  pdfSize: String,
});

export const Speech = mongoose.model("Speech", speechSchema);
