
var createError = require("http-errors");
var express = require("express");
var path = require("path");
// var cookieParser = require("cookie-parser");
var logger = require("morgan");
var session = require("express-session");
var okta = require("@okta/okta-sdk-nodejs");
var ExpressOIDC = require("@okta/oidc-middleware").ExpressOIDC;
require("dotenv").config();
var passport = require("passport");
var GoogleStrategy = require("passport-google-oauth20").Strategy;

const dashboardRouter = require("./routes/dashboard");
const publicRouter = require("./routes/public");
const usersRouter = require("./routes/users");
const loginPageRouter = require("./routes/loginPage");

var app = express();

var secrets = require("./secrets.json")
// https://github.com/okta/okta-sdk-nodejs/issues/78
var oktaClient = new okta.Client({
  orgUrl: process.env.orgUrl,
  token: process.env.okta_authentication_token,
});
const oidc = new ExpressOIDC({
  issuer: process.env.orgUrl + "/oauth2/default",
  client_id: process.env.client_id,
  client_secret: process.env.client_secret,
  redirect_uri: "http://localhost:3000/users/callback",
  scope: "openid profile",
  routes: {
    login: {
      path: "/users/login",
    },
    callback: {
      path: "/users/callback",
      defaultRedirect: "/dashboard",
    },
  },
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.sessionString,
    resave: true,
    saveUninitialized: false,
  })
);
app.use(oidc.router);

app.use((req, res, next) => {
  if (!req.userinfo) {
    return next();
  }

  oktaClient
    .getUser(req.userinfo.sub)
    .then((user) => {
      req.user = user;
      res.locals.user = user;
      next();
    })
    .catch((err) => {
      next(err);
    });
});





function loginRequired(req, res, next) {
  if (!req.user) {
    return res.status(401).render("unauthenticated");
  } else {
    next();
  }
}


var tequila = require("passport-tequila");
var myStrategy = new tequila.Strategy(
  {
    service: "The name of my app", // Appears on Tequila login screen
    request: ["displayname", "firstname"], // Personal info to fetch
  },
  function (userKey, profile, done) {
    User.findOrCreate(profile, function (err, user) {
      done(err, user);
    });
  }
);
passport.use(myStrategy);

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    console.log("sucessfull authentication------------------");
    res.redirect("/");
  }
);

app.use("/", publicRouter);
app.use("/dashboard", loginRequired, dashboardRouter);
app.use("/users", usersRouter);
app.use("/loginpage", loginPageRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
