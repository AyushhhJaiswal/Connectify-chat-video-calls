import { upsertStreamUser } from "../lib/stream.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken"

export async function signup(req,res){
    const {email,password,fullName}=req.body;

    try{
        if(!email || !password || !fullName){
            return res.status(400).json({ message:"All feilds are required" });
        } 

        if(password.length < 6){
            return res.status(400).json({ message:"Password must be atleast 6 characters" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
        }

        const existingUser=await User.findOne({email:email});
        if(existingUser){
            return res.status(400).json({ message: "Email already exists , Please Use a different one" });
        }


    const idx = Math.floor(Math.random() * 100) + 1; // user1 - user100
    const colorOptions = [7, 10, 11, 2, 3];
    const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
    const randomAvatar = `https://tapback.co/api/avatar/user${idx}?color=${randomColor}`;

        const newUser=await User.create({
            email,
            fullName,
            password,
            profilePic:randomAvatar,
        });


        try{
            await upsertStreamUser({
                id:newUser._id.toString(),
                name:newUser.fullName,
                image:newUser.profilePic || "",
            });
            console.log(`stream user created for ${newUser.fullName}`);
        }
        catch(error){
            console.log("Error creating stream user",error);
        }

    

        const token=jwt.sign({userId:newUser._id},process.env.JWT_SECRET_KEY,{
            expiresIn:"7d",
        });
        res.cookie("jwt",token,{
            maxAge:7*24*60*60*1000,
            httpOnly:true,
            sameSite:"strict",
            secure:process.env.NODE_ENV==="production",  
        })
        res.status(201).json({
            success:true,
          user:newUser,
        })
    }
    catch(error){
        console.log("Error in signup Controller",error);
        res.status(500).json({
            message:"Internal server error",
        });
    }
}


export async function login(req,res){
    try{
        const {email,password}=req.body;

        if(!email || !password){
            return res.status(400).json({ message:"All feilds are required" });
        } 
        const user=await User.findOne({email:email});
        if(!user){
            return res.status(401).json({ message:"Invalid email or Password" });
        }
        const isPasswordCorrect=await user.matchPassword(password);
        if(!isPasswordCorrect){
            return res.status(401).json({ message:"Invalid email or Password" });
        }

        const token=jwt.sign({userId:user._id},process.env.JWT_SECRET_KEY,{
            expiresIn:"7d",
        });

        res.cookie("jwt",token,{
            maxAge:7*24*60*60*1000,
            httpOnly:true,
            sameSite:"strict",
            secure:process.env.NODE_ENV==="production",  
        })
        res.status(200).json({
            success:true,
          user,
          message:"login successful",
        });

    }
    catch (error){
        console.log("Error in login Controller",error);
        res.status(500).json({
            message:"Internal server error",
        });
    }
}





export async function logout(req,res){
    res.clearCookie("jwt");
    res.status(200).json({
        success:true,
        message:"logout succesfull",
    })
};

export async function onboard(req,res){
    try{
        const userId=req.user._id;
        const {fullName,bio,nativeLanguage,learningLanguage,location}=req.body;
        if(!fullName || !bio || !nativeLanguage || !learningLanguage || !location){

                return res.status(400).json({message:"All fields are required",
                    missingFields:[
                        !fullName && "fullName",
                        !bio && "bio",
                        !nativeLanguage && "nativeLanguage",
                        !learningLanguage && "learningLanguage",
                        !location && "location",
                    ].filter(Boolean),
                });
        }
        const updatedUser=await User.findByIdAndUpdate(userId,{
            ...req.body,
            isOnboarded:true,
        },{new:true})
        if(!updatedUser){
            return res.status(404).json({ message:"User not found" });
        }
        try{

            await upsertStreamUser({
                id:updatedUser._id.toString(),
                name:updatedUser.fullName,
                image:updatedUser.profilePic || "",

            })
            console.log(`Stream user updated after onboarding for ${updatedUser.fullName}`)
        }
        catch(StreamError){
            console.log("Error updating stream user during onboarding",StreamError)
        }
        return res.status(200).json({ success:true,user:updatedUser,});
    }
    catch(error){
        console.log("Error onboarding",error);
        return res.status(500).json({ message:"Internal server error" });
    }
}