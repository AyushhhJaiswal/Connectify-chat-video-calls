import mongoose from "mongoose";
export const connectDB=async()=>{
    try{
      const conn= await mongoose.connect(process.env.MONGO_URL);
      console.log(`Mongo DB connected to ${conn.connection.host}`);
    }
    catch(error){
        console.log("Error connecting to mongo Db",error);
        process.exit(1);
    }
}