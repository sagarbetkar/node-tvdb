const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('morgan');

const mongoose = require('mongoose');

const request = require('request');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');

mongoose.connect('mongodb://localhost:27017/tvdb');
mongoose.connection.on('error', (error) => console.error(error));
mongoose.connection.on('open', () => console.log("success in connecting to mongodb"));

const userController = require('./controllers/users');
const showController = require('./controllers/shows');

const app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.get('/api/shows', showController.getAllShows);
app.get('/api/tvdb', showController.getShowsFromTvdbs);
app.get('/api/shows/:id', showController.getShowById);
app.post('/api/shows', showController.postNewShow);
app.post('/api/shows/subscribe', userController.ensureAuthenticated, showController.postNewSubscribe);
app.post('/api/shows/unsubscribe', userController.ensureAuthenticated, showController.postUnSubscribe);

app.post('/auth/login', userController.userNormalLogin);
app.post('/auth/signup', userController.userSignUp);
app.post('/auth/facebook', userController.userFacebookLogin);
app.post('/auth/google', userController.userGoogleLogin);
app.get('/api/users', userController.getUsers);

module.exports = app;
