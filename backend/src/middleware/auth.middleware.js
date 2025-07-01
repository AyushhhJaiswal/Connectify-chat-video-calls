import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectRoute=async(req,res,next)=>{
try{    
    const token=req.cookies.jwt
    if(!token){
        return res.status(401).json({message:"Unauthorized - No Token provided"});
    }
    const decode=jwt.verify(token,process.env.JWT_SECRET_KEY);
    if(!decode){
        return res.status(401).json({message:"Unauthorized - Invalid token"});
    }
    const user=await User.findById(decode.userId).select("-password");
    if(!user){
        return res.status(401).json({message:"Unauthorized - User not found"});
    }
    req.user=user;
    next();
}
catch(error){
    console.log("Error in protect route middleware",error);
    return res.status(500).json({message:"Internal server error"});
    
}
}