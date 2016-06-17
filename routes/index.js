'use strict';
var express = require('express');
var router = express.Router();
var tweetBank = require('../tweetBank');

module.exports = function makeRouterWithSockets (io, client) {

  // a reusable function
  function respondWithAllTweets (req, res, next){
    client.query('SELECT users.name, users.pictureurl, tweets.id, tweets.content \
      FROM tweets \
      INNER JOIN users ON users.id = tweets.userid', function (err, result) {
  if (err) return next(err); // pass errors to Express
    var tweets = result.rows;
    res.render('index', { title: 'Twitter.js', tweets: tweets, showForm: true });
  });
  }

  // here we basically treet the root view and tweets view as identical
  router.get('/', respondWithAllTweets);
  router.get('/tweets', respondWithAllTweets);

  // single-user page
  router.get('/users/:username', function(req, res, next){
    client.query('SELECT users.name, users.pictureurl, tweets.id, tweets.content \
    FROM tweets \
    INNER JOIN users ON users.id = tweets.userid WHERE users.name = $1', [req.params.username], 
    function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweetsForName = result.rows;
      res.render('index', { title: 'Twitter.js', tweets: tweetsForName /* showForm: true */});
    });
  });

// by-hashtag page
  router.get('/hashtag/:tag', function(req, res, next){
    client.query('SELECT users.name, users.pictureurl, tweets.id, tweets.content \
    FROM tweets \
    INNER JOIN users ON users.id = tweets.userid WHERE tweets.content LIKE $1', ["%#" + req.params.tag + "%"], 
    function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweetsForName = result.rows;
      res.render('index', { title: 'Twitter.js', tweets: tweetsForName /* showForm: true */});
    });
  });

  // single-tweet page
  router.get('/tweets/:id', function(req, res, next){
    client.query('SELECT users.name, users.pictureurl, tweets.id, tweets.content \
    FROM tweets \
    INNER JOIN users ON users.id = tweets.userid WHERE tweets.id = $1', [req.params.id], 
    function (err, result) {
      if (err) return next(err); // pass errors to Express
      var tweetsForID = result.rows;
      res.render('index', { title: 'Twitter.js', tweets: tweetsForID /* showForm: true */});
    });
  });

 // create a new tweet
 router.post('/tweets', function(req, res, next){
  var pictureurl;
  client.query('SELECT users.id , pictureurl FROM users WHERE users.name = $1', [req.body.name], function (err, result) {
    if (err) return next(err); // pass errors to Express
    if(result.rows.length == 0){
       client.query('INSERT INTO users (name, pictureurl) VALUES ($1, $2)', [req.body.name, 
        'https://pbs.twimg.com/profile_images/2450268678/olxp11gnt09no2y2wpsh_normal.jpeg'], function (err, data) {
          if (err) return next(err);
          client.query("SELECT pictureurl from users where users.name = $1 ", [req.body.name], function (err, userData) {
            if (err) return next(err);
            pictureurl = userData.rows[0].pictureurl;
            doRest();
          });
        });
    } else {
      pictureurl = result.rows[0].pictureurl;
      doRest();
    }
  });
  // Wrapped in a function because it's invoked in two places.  We may have created the user.  We have the 
  // picture URL in var pictureurl.
  function doRest() {
  client.query('INSERT INTO tweets (userId, content) VALUES ((SELECT id from Users where name = $1), $2) returning id', 
    [req.body.name, req.body.content], function (err, data) {
      if(err) return next(err);
      var tweetid = data.rows[0].id;
      io.sockets.emit('new_tweet', {name: req.body.name, content: req.body.content, pictureurl: pictureurl, id: tweetid});
      res.redirect('/');
    });
  }
});

  //INSERT INTO Tweets (userId, content) VALUES ((SELECT id from Users where name='Donald Trump'), 'Make Fullstack great again!');

  // // replaced this hard-coded route with general static routing in app.js
  // router.get('/stylesheets/style.css', function(req, res, next){
  //   res.sendFile('/stylesheets/style.css', { root: __dirname + '/../public/' });
  // });


  return router;
}
