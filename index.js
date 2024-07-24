const express = require('express');
const cors = require('cors'); //to send req from frontend to backend
const User = require('./models/user'); //grabbing the User Model
const Post=require('./models/post'); //grabbing the Post Model
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');//for making the passwords encrypt
const jwt = require('jsonwebtoken');
const cookieParser=require('cookie-parser');
const multer=require('multer');

//for hosting
const path= require("path");




const uploadMiddleware=multer({dest:'uploads/'}); 
const fs=require('fs'); //fs is from  file system
const authMiddleware = require('./middlewares/authMiddleware'); // Import your auth middleware
const app = express();
app.use(cors({ credentials: true, origin: 'http://localhost:3000' })); 
app.use(express.urlencoded({ extended: true }))
app.use(express.json());//middle ware  to use req.body
app.use(cookieParser());

// app.use(express.static('uploads'));
app.use('/uploads',express.static(__dirname+'/uploads'));
mongoose.connect('mongodb+srv://aiman:niazi@cluster0.4fz3tlo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

const salt = bcrypt.genSaltSync(10); //a random string
const secret = 'efywefgywefew';


app.get("/",(req,res)=>{ //this is telling that we are running our frontend file with the help of our backend

  app.use(express.static(path.resolve(__dirname, "client", "build")));
  res.sendFile(path.resolve(__dirname,"client", "build", "index.html"));


});

//cant call res.json 2  times so commenting  one
app.post('/register', async (req, res) => {
  const { Username, Password } = req.body; //grabbing username and password from req.body

  try {
    const UserDoc = await User.create({
      Username,
      Password: bcrypt.hashSync(Password, salt),
    });
    res.json(UserDoc);
  } catch (e) {
    res.status(400).json(e);
  }
});
app.post('/login', async (req, res) => {
  const { Username, Password } = req.body;

  try {
    const UserDoc = await User.findOne({ Username });
    if (!UserDoc) {
      return res.status(400).json('Wrong credentials');
    }

    const passOk = bcrypt.compareSync(Password, UserDoc.Password);
    if (passOk) {
      jwt.sign({ Username, id: UserDoc._id }, secret, {}, (err, token) => {
        if (err) throw err;
        res.cookie('token', token, { httpOnly: true, sameSite: 'Lax' }); //if not error then reply with the token aand
        //sending as a cookie annd not as a json

    //    console.log('Token set in cookie:', token); // Log the token
        res.json({ //we will send id,username
          id: UserDoc._id,
          Username,
        });
      });
    } else {
      res.status(400).json('Wrong credentials');
    }
  } catch (err) {
    res.status(500).json('An error occurred');
  }
});




app.post('/logout', (req,res)=>{
res.cookie('token','').json('ok');

});

app.get('/profile', (req, res) => {
  const token = req.cookies.token; // grabbing the token from cookies
  // console.log('Token received from cookies:', token); // Log the token
  if (!token) return res.status(401).json('No token provided');

  jwt.verify(token, secret, {}, (err, info) => {
    if (err) return res.status(401).json('Invalid token');
    res.json(info);
  });
});

app.post('/post',uploadMiddleware.single('file'), async  (req,res)=>{
//we want to save this file to our uploads directory (we will grab the file from the req-from the library called multer)
//renaming the file so it can look like a real file and we can look at it

// console.log('req.file:', req.file);
// if (!req.file) {
//     return res.status(400).json({ error: 'No file uploaded' });
// }

const { originalname } = req.file;
const parts= originalname.split('.'); //everythin before the dot
const ext=parts[parts.length -1]; //ext gives jpg or png
//now renaming the files name to filename.jgp we need FS library
const{ path } = req.file;
const newpath = path+'.'+ext;
fs.renameSync(path,newpath);

const token= req.cookies.token; //grabbing the token from cookiess
jwt.verify(token,secret,{}, async(err,info)=>{
  if(err) throw err;
  //grabing title summary content from req.body
const { title,summary,content } = req.body;
const postDoc= await Post.create({
  title,
  summary,
  content,
  cover:newpath,
  author:info.id,
});
res.json ({ postDoc });
});
//res.json({files:req.file});
});


app.put('/post', uploadMiddleware.single('file'), async (req, res) => {
  let newPath = null;

  if (req.file) {
      const { originalname } = req.file;
      const parts = originalname.split('.');
      const ext = parts[parts.length - 1];
      const { path } = req.file;
      newPath = `${path}.${ext}`;
      fs.renameSync(path, newPath);
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {  //verifying the cookie
      if (err) throw err;

      const { id, title, summary, content } = req.body;
      const postDoc = await Post.findById(id);

      if (!postDoc) {
          return res.status(404).json('Post not found');
      }

      const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id); //if stringify not used then comes false
      if (!isAuthor) {
          return res.status(400).json('You are not the author');
      }
      
      // Update the fields
      postDoc.title = title;
      postDoc.summary = summary;
      postDoc.content = content;
      postDoc.cover = newPath ? newPath : postDoc.cover; // if new path exists then update to new path

      await postDoc.save();

      res.json({ postDoc });
  });
});

app.delete('/deletepost/:id', authMiddleware, async (req, res) => {
  try {
    const postDoc = await Post.findById(req.params.id);
    if (!postDoc) {
      return res.status(404).json('Post not found');
    }

    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(req.user.id);
    if (!isAuthor) {
      return res.status(400).json('You are not the author');
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json('Post deleted successfully');
  } catch (err) {
    console.error(err);
    res.status(500).json('Internal server error');
  }
});



app.get('/post',  async(req,res)=>{
const posts=await Post.find().
populate('author',['Username']).
sort({createdAt:-1})
.limit(20); //if there are 5000 posts then we want to see only 20
res.json(posts);

});

app.get('/post/:id', async (req, res) => {
  const { id } = req.params; // Grabbing the ID from request parameters
  try {
    // Fetching the post by ID and populating the author field with the Username
    const postDoc = await Post.findById(id).populate('author', ['Username']);
    
    if (postDoc) {
      // Sending the fetched post as JSON response
      res.json(postDoc);
    } else {
      res.status(404).json({ message: 'Post not found' });
    }
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

  



app.listen(4000, () => {
  console.log('Server is running on port 4000');
});
