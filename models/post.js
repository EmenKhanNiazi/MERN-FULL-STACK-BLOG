const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const PostSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    summary: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    cover: {
        type: String, // This will be the path to a file inside uploads
    },
    author:{
        type:Schema.Types.ObjectId, ref:'User'}, 
}, {
    timestamps: true, // We will know when the post has been created
});

const PostModel = model('Post', PostSchema); // Name will be 'Post' and schema will be PostSchema
module.exports = PostModel;
