import axios from "axios"
import Chat from "../models/Chat.js"
import User from "../models/User.js"
import imagekit from "../configs/imageKit.js"
import openai from "../configs/openai.js"

// Text-based AI chat Message Controller
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        // check credits
        if (req.user.credits < 1) {
            return res.json({ success: false, message: "You don't have enough credits to use this feature" });
        }

        const { chatId, prompt } = req.body;
        const chat = await Chat.findOne({ userId, _id: chatId });

        if (!chat) {
            return res.json({ success: false, message: "Chat not found" });
        }

        // push user message
        chat.messages.push({
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            isImage: false
        });

        // AI reply
        const { choices } = await openai.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const reply = {
            ...choices[0].message,
            timestamp: Date.now(),
            isImage: false
        };

        // push AI reply to DB
        chat.messages.push(reply);
        await chat.save();

        // deduct credits
        await User.updateOne({ _id: userId }, { $inc: { credits: -1 } });

        // send final response (only once!)
        return res.json({ success: true, reply });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}

// Image generator Message Controller
export const imageMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        // check credits
        if (req.user.credits < 2) {
            return res.json({ success: false, message: "You don't have enough credits to use this feature" });
        }

        const { prompt, chatId, isPublished } = req.body;

        const chat = await Chat.findOne({ userId, _id: chatId });
        if (!chat) {
            return res.json({ success: false, message: "Chat not found" });
        }

        // push user message
        chat.messages.push({
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            isImage: false
        });

        // encode the prompt
        const encodedPrompt = encodeURIComponent(prompt);

        // construct Imagekit AI generation URL
        const generatedImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/quickgpt/${Date.now()}.png?tr=w-800,h-800`;

        // fetch AI-generated image
        const aiImageResponse = await axios.get(generatedImageUrl, { responseType: "arraybuffer" });

        // convert to base64
        const base64Image = `data:image/png;base64,${Buffer.from(aiImageResponse.data, "binary").toString("base64")}`;

        // upload to ImageKit
        const uploadResponse = await imagekit.upload({
            file: base64Image,
            fileName: `${Date.now()}.png`,
            folder: "quickgpt"
        });

        const reply = {
            role: "assistant",
            content: uploadResponse.url,
            timestamp: Date.now(),
            isImage: true,
            isPublished
        };

        // save to DB
        chat.messages.push(reply);
        await chat.save();

        // deduct credits
        await User.updateOne({ _id: userId }, { $inc: { credits: -2 } });

        // final response
        return res.json({ success: true, reply });

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}
