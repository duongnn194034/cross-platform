const {
    PRIVATE_CHAT,
    GROUP_CHAT,
} = require('../constants/constants');
const ChatModel = require("../models/Chats");
const MessagesModel = require("../models/Messages");
const httpStatus = require("../utils/httpStatus");
const chatController = {};

chatController.getMessages = async (req, res, next) => {
    try {
        let chat = await ChatModel.findOne({
            $and: [
                { _id: req.params.chatId },
                { members: req.userId }
            ]
        }).populate('messsages');
        if (chat !== null) {
            return res.status(httpStatus.OK).json({
                data: chat.messsages
            });
        } else {
            return res.status(httpStatus.NOT_FOUND).json({ message: "Not found conversation!" });
        }
    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: e.message
        });
    }
}


chatController.getChats = async (req, res, next) => {
    try {
        let chats = await ChatModel.find({ members: req.userId }).populate('members');
        let results  = [];
        for (let i = 0; i < chats.length; i++) {
            let res = {
                chatId: chats[i]._id,
                lastMessage: null,
                friend: null,
                seen: false,
            };
            for(let j =0; j< chats[i].members.length; i++){
                if(chats[i].members[j]._id == req.userId){
                    res.friend = chats[i].members[j];
                    res.seen = chats[i].seens[j];
                }
            }
            res.lastMessage = await MessagesModel.findOne({ _id: chats[i].messsages[chats[i].messsages.length - 1] });
            results.push(res);
        }

        return res.status(httpStatus.OK).json({
            data: results
        });

    } catch (e) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            message: e.message
        });
    }
}


chatController.saveMessage = async (msg) => {
    try {
        let chat = null;
        let needUpdate = true;
        if (msg.chatId) {
            chat = chat = await ChatModel.findOne({
                $and: [
                    { _id: msg.chatId },
                    { members: { $all: [msg.senderId, msg.receiverId] } },
                    { members: { $size: 2 } }
                ]
            });
        }

        if (!chat) {
            chat = await ChatModel.findOne({
                $and: [
                    { members: { $all: [msg.senderId, msg.receiverId] } },
                    { members: { $size: 2 } }
                ]
            });
        }

        if (!chat) {
            chat = new ChatModel({
                messsages: [],
                members: [msg.senderId, msg.receiverId],
                seens: [true, false],
            });
            needUpdate = false;
        }

        // console.log(chat)
        let message = new MessagesModel({
            time: msg.time,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            content: msg.content,
        });
        await message.save();
        chat.messsages.push(message);
        await chat.save();

        if (needUpdate) {
            let seens = [false, false];
            for (let i = 0; i < chat.members.length; i++) {
                if (chat.members[i] != msg.senderId) {
                    seens[i] = false;
                } else {
                    seens[i] = true;
                }
            }
            await ChatModel.updateOne({ _id: chat._id }, { seens: seens });
        }
    } catch (e) {
        console.log(e);
    }
}

module.exports = chatController;