import {StreamChat} from "stream-chat";
import "dotenv/config";

const apikey=process.env.STREAM_API_KEY;
const apiSecret=process.env.STREAM_API_SECRET;

if (!apikey || !apiSecret) {
    console.error("STREAM api key or secret is missing");
}


const streamClient=StreamChat.getInstance(apikey,apiSecret);

export const upsertStreamUser=async(userData)=>{
    try{    
            await streamClient.upsertUsers([userData]);
            return userData;
    }
    catch(error){
        console.log("error upserting stream user",error)

    }
};

export const generateStreamToken=async(userId)=>{
    try{
        const userIdStr=userId.toString();
        return streamClient.createToken(userIdStr);

    }
    catch(error){
        console.log("Error generating steam token",error);
    }
};