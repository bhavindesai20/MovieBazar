var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Movie = mongoose.model('movies');
var Favourite = mongoose.model('Favourite');


router.post('/user', function(req, res, next) {
    var userObj = new User(req.body);
    User.find({
        user: userObj.user,
        password: userObj.password
    }, function(err, userList) {
        if (userList.length > 0) {
            res.send(409, {
                "user": "available",
                "userList": userList.length
            });
        } else {
            userObj.save(function(err, user) {
                if (err) {
                    return next(err);
                }
                res.json(user);
            });
        }
    });
});

router.post('/user/login', function(req, res, next) {
    var userObj = new User(req.body);
    User.find({
        user: userObj.user,
        password: userObj.password
    }, function(err, userList) {
        if (err) {
            return next(err);
        }
        if (userList.length === 0) {
            res.send(401, {
                "user": "unAuthorized"
            });
        } else {
            Favourite.find({
                userId: userList[0]._id
            }, function(err, userFav) {
                if (err) {
                    return next(err);
                }
                userList.push(userFav);
                console.log(userList);
                res.json(userList);
            });
        }
    });
});

router.post('/movie', function(req, res, next) {
    var movieObj = new Movie(req.body);
    Movie.find({
        imdbID: movieObj.imdbID
    }, function(err, movieList) {
        if (movieList.length > 0) {
            res.send(409, {
                "movie": "available",
                "movieList": movieList.length
            });
        } else {
            movieObj.save(function(err, movie) {
                if (err) {
                    return next(err);
                }
                res.json(movie);
            });
        }
    });
});

router.get('/movies', function(req, res, next) {
    Movie.find(function(err, movies) {
        if (err) {
            return next(err);
        }
        res.json(movies);
    });
});

router.get('/movie/:movieId', function(req, res, next) {
    Movie.find({
        imdbID: req.params.movieId
    }, function(err, movie) {
        if (err) {
            return next(err);
        }
        res.json(movie);
    });
});

router.get('/movie/fav/:movieId', function(req, res, next) {
    Movie.find({
        _id: req.params.movieId
    }, function(err, movie) {
        if (err) {
            return next(err);
        }
        res.json(movie);
    });
});

router.get('/movie/fav/user/:userId', function(req, res, next) {
    Favourite.find({
        userId: req.params.userId
    }, function(err, allMovie) {
        if (err) {
            return next(err);
        }
        res.json(allMovie);
    });
});

router.post('/movie/:movieId/favourite', function(req, res, next) {
    var favObj = new Favourite(req.body);

    Movie.find({
        _id: req.params.movieId
    }, function(err, movie) {
        if (err) {
            return next(err);
        }
        var movObj = movie[0];
        favObj.favourite = movObj;
        //res.json(movie[0]);
        favObj.save(function(err, fav) {
            if (err) {
                return next(err);
            }
            movObj.favSubscriber.push(fav);
            movObj.save(function(err, movie) {
                if (err) {
                    return next(err);
                }
                res.json(fav);
            });
        });
    });


});


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', {
        title: 'Express'
    });
});

module.exports = router;
