const express = require("express");
const session = require("express-session");
const passport = require("passport");

require("dotenv").config();

require('./auth')

function isLoggedIn(req, res, next) {
    req.user ? next() : res.sendStatus(401)
}

const app = express();
app.use(session({ secret: process.env.sessionSecret }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
    res.send('<a href="/auth/google"> Authenticate with google')
})

app.get('/auth/google', 
  passport.authenticate('google', { scope: ['email', 'profile'] })
)

app.get('/auth/google/callback',
    passport.authenticate('google', {
        successRedirect: '/protected',
        failureRedirect: '/auth/failure',
    })
)

app.get('/auth/failure', (req, res) => {
  res.send('Something went wrong...');
});    

app.get('/protected', isLoggedIn, (req, res) => {
    // console.log(req);
    res.send(`Hello ${req.user.displayName}`);
})    

app.get('/logout', (req, res) => {
    req.logout()
    req.session.destroy()
    res.send('Goodbye!');
})    



app.listen(3000, () => console.log('listening on: 3000'))

