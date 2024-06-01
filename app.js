if(process.env.NODE_ENV!="production"){
  require('dotenv').config();
}



const express = require("express");
const app = express();
const mongoose = require("mongoose");
 const passport=require('passport');
 const LocalStrategy=require('passport-local');
const Review = require("./models/review.js");
const path = require("path");
const Listing = require("./models/listing.js");
const User=require("./models/user.js");
const methodOverride = require("method-override");
const ejsMate=require("ejs-mate");
const wrapAsync=require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash=require("connect-flash");
const {listingSchema,reviewSchema}=require("./schema.js");
app.engine("ejs",ejsMate);
app.set("views",path.join(__dirname,"views"));
app.set("view engine","ejs");



const listingRouter=require("./routes/listing.js");
const reviewRouter=require("./routes/review.js");
const userRouter=require("./routes/user.js");
const user = require("./models/user.js");

const dbUrl=process.env.ATLASDB_URL;

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use(express.static(path.join(__dirname,"/public")));


const store=MongoStore.create({
  mongoUrl:dbUrl,
  crypto:{
    secret:process.env.SECRET,
  },
  touchAfter:24*3600
  });

  store.on("error", ()=>{
console.log("ERROR IN MONGO STORE",err);
  });

const sessionOptions={
  store,
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:true,
  cookie:{
    expires : Date.now() + 7*24*60*60*1000,
    maxAge : 7*24*60*60*1000,
    httpOnly : true

  },
};


app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.use((req,res,next)=>{
res.locals.success=req.flash("success");
res.locals.error=req.flash("error");
res.locals.currUser=req.user;
next();

});

app.get("/search",async(req,res)=>{
let place=req.query.search;
let lists=await Listing.find({country:place});
if(lists.length){
  res.render("listings/search.ejs",{lists,place});
}
else{
  req.flash("error",`No Listings Found in ${place}`);
  res.redirect("/listings");
}

});




app.use("/listings",listingRouter);
app.use("/listings/:id/reviews",reviewRouter);
app.use("/",userRouter);





app.all("*",(req,res,next)=>{
  next(new ExpressError(404,"Page not Found "));
})
app.use((err,req,res,next)=>{
  let {statusCode=500,message="Something went wrong"} = err;
  res.status(statusCode).render("error.ejs",{message});
});

app.listen(8080, () => {
  console.log("server is listening to port 8080");
});


