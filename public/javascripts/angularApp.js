//storage methods
Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
}

Storage.prototype.getObject = function(key) {
    var value = this.getItem(key);
    return value && JSON.parse(value);
}

//end storage
var app = angular.module('tvMovie', ['ui.router', 'ngCookies']);

app.config([
    '$stateProvider',
    '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {

        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: '/templates/home.html',
                controller: 'MainCtrl',
                resolve: {
                    postPromise: ['movies', function(movies) {
                        return movies.getAll();
                    }]
                }
            }).state('register', {
                url: '/register',
                templateUrl: '/templates/register.html',
                controller: 'registerCtrl'
            }).state('login', {
                url: '/login',
                templateUrl: '/templates/login.html',
                controller: 'loginCtrl'
            }).state('addMovie', {
                url: '/addMovie',
                templateUrl: '/templates/addMovie.html',
                controller: 'addMovieCtrl'
            }).state('movie', {
                url: '/movie/{id}',
                templateUrl: '/templates/movie.html',
                controller: 'MovieCtrl',
                resolve: {
                    movie: ['$stateParams', 'movies', function($stateParams, movies) {
                        return movies.getMovie($stateParams.id);
                    }]
                }
            }).state('favourite', {
                url: '/favourite',
                templateUrl: '/templates/favourites.html',
                controller: 'favouriteCtrl',
                resolve: {
                    favMovie: ['$stateParams', 'movies', 'userAuth', function($stateParams, movies, userAuth) {
                        return movies.getallFav(userAuth.userId);
                    }]
                }
            });
        $urlRouterProvider.otherwise('home');
    }
]);


app.factory('userAuth', ['$http', '$state', '$window', '$q',
    function($http, $state, $window, $q) {
        var u = {};
        u.currentUser = false;
        u.userId = false;
        u.favourite = [];

        u.addUser = function(user) {
            return $http.post('/user', user).success(function(data) {
                $state.go('login');
            }).error(function(err) {
                if (err.user === 'available') {
                    alert('UserName already exist');
                    return;
                } else {
                    alert('Something went wrong. Please try again');
                }
            });
        };

        u.getUser = function(user) {
            return $http.post('/user/login', user)
                .success(function(data) {
                    console.log(data);
                    var userSes = {
                        'user': data[0].user,
                        '_id': data[0]._id,
                        'favourite': data[1]
                    }
                    u.setSession(userSes);
                    $state.go('home');
                })
                .error(function(err) {
                    console.log(err);
                    if (err.user === 'unAuthorized') {
                        alert('User does not exist. Please Regiser First');
                        $state.go('register');
                    } else {
                        alert('Something went wrong. Please try again');
                    }
                });
        };

        // set session data
        u.setSession = function(userdata) {
            if (userdata.user) u.currentUser = userdata.user;
            if (userdata._id) u.userId = userdata._id;
            if (userdata.favourite) u.favourite = userdata.favourite;
            // set data in localstorage object
            var newUser = {
                'user': u.currentUser,
                '_id': u.userId,
                'favourite': u.favourite
            };
            localStorage.setObject('user', newUser);
        };

        // check if there's a user session present
        u.checkSession = function() {
            if (u.userId) {
                return true;
            } else {
                // detect if there's a session in localstorage from previous use.
                // if it is, pull into our service
                var userObject = localStorage.getObject('user');
                if (userObject) {
                    // if there's a user, lets grab their favorites from the server
                    u.setSession(userObject);
                    return true;
                } else {
                    return false;
                }
            }
        };

        // wipe out our session data
        u.destroySession = function() {
            $window.localStorage['user'] = '';
            u.currentUser = '';
            u.userId = '';
            $state.go('login');
        };

        return u;

    }
]);

app.factory('movies', ['$http', '$state', 'userAuth', function($http, $state, userAuth) {
    var m = {
        movieList: []
    };

    m.getMovieFromOMDB = function(movieurl) {
        return $http.get(movieurl);
    };

    m.addThisMovie = function(movieData) {
        return $http.post('/movie', movieData);
    };

    m.getAll = function() {
        return $http.get('/movies').success(function(data) {
            angular.copy(data, m.movieList);
        });
    };

    m.getMovie = function(thisMovie) {
        return $http.get('/movie/' + thisMovie).then(function(res) {
            return res.data;
        });
    };

    //this is for movie ID
    m.getFavMovie = function(thisMovie) {
        return $http.get('/movie/fav/' + thisMovie);
    };

    m.addFav = function(movieId, user) {
        return $http.post('/movie/' + movieId + '/favourite', user);
    };

    m.getallFav = function(userId) {
        return $http.get('/movie/fav/user/' + userId);
    };


    return m;

}]);

//here movies is service and movie is resolve param
app.controller('MovieCtrl', [
    '$scope', 'movies', '$location', 'movie',
    function($scope, movies, $location, movie) {
        //we are updating movieList in movies when initializing main path in config with resolve
        $scope.movie = movie[0];
        $scope.movie.Released = $scope.movie.Released.slice(0, 10);
        $scope.cUser = '';
        //rating
        function getRating(input) {
            console.log('Data', input);
            if (input !== null) {
                var inInt = parseInt(input);
                var frac = (parseFloat((input - inInt).toFixed(1))) * 10;
                console.log(frac);
                if (frac < 5) {
                    frac = 0;
                } else if (frac == 5) {
                    frac = 0.5;
                } else {
                    frac = 1.0;
                }
                input = inInt + frac;
                console.log('int  ' + inInt + '  float' + frac);
                input = input.toString().replace('.', '-');
                return input.replace('.', '-');
            } else {
                return "0-0";
            }
        }
        if ($scope.movie.imdbRating !== '') {
            var tempImdb = $scope.movie.imdbRating;
            tempImdb = ((tempImdb) / 2);
            tempImdb = parseFloat((tempImdb).toFixed(1));
            console.log('value to parse' + tempImdb);
            var getRat = getRating(tempImdb);
            console.log('getRat', getRat);
            if (getRat === '0' || getRat === '0-0') {
                $('.star-1-off').css({
                    display: 'inline-block'
                });
                $('.star-2-off').css({
                    display: 'inline-block'
                });
                $('.star-3-off').css({
                    display: 'inline-block'
                });
                $('.star-4-off').css({
                    display: 'inline-block'
                });
                $('.star-5-off').css({
                    display: 'inline-block'
                });
            } else if (getRat === '0-5') {
                $('.star-1-half').css({
                    display: 'inline-block'
                });
                $('.star-2-off').css({
                    display: 'inline-block'
                });
                $('.star-3-off').css({
                    display: 'inline-block'
                });
                $('.star-4-off').css({
                    display: 'inline-block'
                });
                $('.star-5-off').css({
                    display: 'inline-block'
                });
            } else if (getRat === '1') {
                $('.star-1-on').css({
                    display: 'inline-block'
                });
                $('.star-2-off').css({
                    display: 'inline-block'
                });
                $('.star-3-off').css({
                    display: 'inline-block'
                });
                $('.star-4-off').css({
                    display: 'inline-block'
                });
                $('.star-5-off').css({
                    display: 'inline-block'
                });
            } else if (getRat === '1-5') {
                $('.star-1-on').css({
                    display: 'inline-block'
                });
                $('.star-2-half').css({
                    display: 'inline-block'
                });
                $('.star-3-off').css({
                    display: 'inline-block'
                });
                $('.star-4-off').css({
                    display: 'inline-block'
                });
                $('.star-5-off').css({
                    display: 'inline-block'
                });
            } else if (getRat === '2') {
                $('.star-1-on').css({
                    display: 'inline-block'
                });
                $('.star-2-on').css({
                    display: 'inline-block'
                });
                $('.star-3-off').css({
                    display: 'inline-block'
                });
                $('.star-4-off').css({
                    display: 'inline-block'
                });
                $('.star-5-off').css({
                    display: 'inline-block'
                });
            } else if (getRat === '2-5') {
                $('.star-1-on').css({
                    display: 'inline-block'
                });
                $('.star-2-on').css({
                    display: 'inline-block'
                });
                $('.star-3-half').css({
                    display: 'inline-block'
                });
                $('.star-4-off').css({
                    display: 'inline-block'
                });
                $('.star-5-off').css({
                    display: 'inline-block'
                });
            } else if (getRat === '3') {
                $('.star-1-on').css({
                    display: 'inline-block'
                });
                $('.star-2-on').css({
                    display: 'inline-block'
                });
                $('.star-3-on').css({
                    display: 'inline-block'
                });
                $('.star-4-off').css({
                    display: 'inline-block'
                });
                $('.star-5-off').css({
                    display: 'inline-block'
                });
            } else if (getRat === '3-5') {
                $('.star-1-on').css({
                    display: 'inline-block'
                });
                $('.star-2-on').css({
                    display: 'inline-block'
                });
                $('.star-3-on').css({
                    display: 'inline-block'
                });
                $('.star-4-half').css({
                    display: 'inline-block'
                });
                $('.star-5-off').css({
                    display: 'inline-block'
                });
            } else if (getRat === '4') {
                $('.star-1-on').css({
                    display: 'inline-block'
                });
                $('.star-2-on').css({
                    display: 'inline-block'
                });
                $('.star-3-on').css({
                    display: 'inline-block'
                });
                $('.star-4-on').css({
                    display: 'inline-block'
                });
                $('.star-5-off').css({
                    display: 'inline-block'
                });
            } else if (getRat === '4-5') {
                $('.star-1-on').css({
                    display: 'inline-block'
                });
                $('.star-2-on').css({
                    display: 'inline-block'
                });
                $('.star-3-on').css({
                    display: 'inline-block'
                });
                $('.star-4-on').css({
                    display: 'inline-block'
                });
                $('.star-5-half').css({
                    display: 'inline-block'
                });
            } else if (getRat === '5') {
                $('.star-1-on').css({
                    display: 'inline-block'
                });
                $('.star-2-on').css({
                    display: 'inline-block'
                });
                $('.star-3-on').css({
                    display: 'inline-block'
                });
                $('.star-4-on').css({
                    display: 'inline-block'
                });
                $('.star-5-on').css({
                    display: 'inline-block'
                });
            }

        }
        //rating end
    }
]);

app.controller('favouriteCtrl', [
    '$scope', 'movies', '$location', 'userAuth', 'favMovie',
    function($scope, movies, $location, userAuth, favMovie) {
        $scope.Userfav = [];
        var favArr = favMovie.data;
        $.each(favArr, function(index, val) {
            var thisFav = movies.getFavMovie(val.favourite);
            thisFav.then(function(resp) {
                resp.data[0].hoverValue = false;
                $scope.Userfav.push(resp.data[0]);
            });
        });
        $scope.showInfo = function(show) {
            show.hoverValue = true;
        };
        $scope.hideInfo = function(show) {
            show.hoverValue = false;
        };
        $scope.getallFav = function() {
            movies.getallFav(userAuth.userId).then(function(res) {
                $scope.Userfav = [];
                $.each(res.data, function(index, val) {
                    var thisFav = movies.getFavMovie(val.favourite);
                    thisFav.then(function(resp) {
                        resp.data[0].hoverValue = false;
                        $scope.Userfav.push(resp.data[0]);
                    });
                });
                return $scope.Userfav;
            });
        };
    }
]);


app.controller('MainCtrl', [
    '$scope', 'movies', '$location', 'userAuth',
    function($scope, movies, $location, userAuth) {
        //we are updating movieList in movies when initializing main path in config with resolve
        $scope.movies = movies.movieList;
        $.each($scope.movies, function(index, value) {
            //add for handling hovering element
            value.hoverValue = false;
            value.inFav = false;
        });

        $scope.cUser = userAuth.currentUser;
        if ($scope.cUser !== undefined || $scope.cUser !== null || $scope.cUser !== false || $scope.cUser !== '') {
            $scope.favArray = [];
            movies.getallFav(userAuth.userId).then(function(res) {
                console.log(res.data);
                $.each(res.data, function(index, val) {
                    $scope.favArray.push(val.favourite);
                });

                $.each($scope.movies, function(index, val) {
                    console.log(val);
                    for (var i = 0; i < $scope.favArray.length; i++) {
                        if ($scope.favArray[i] === val._id) {
                            val.inFav = true;
                            console.log('Match');
                        }
                    }
                });

            });
        }

        $scope.showInfo = function(show) {
            show.hoverValue = true;
        };
        $scope.hideInfo = function(show) {
            show.hoverValue = false;
        };

        $scope.addFav = function(show) {
            movies.addFav(show._id, {
                userId: userAuth.userId,
            }).success(function(fshow) {
                $.map($scope.movies, function(obj) {
                    if (obj._id === show._id)
                    {
                        obj.inFav=true;
                    }
                });
                $scope.alertMsg = "You added " + show.Title+" to your favourite";
                $scope.modalShown = true;
            });
        };
    }
]);

app.controller('addMovieCtrl', [
    '$scope', 'movies', '$location', '$state',
    function($scope, movies, $location, $state) {
        //alert
        $scope.alertMsg = '';
        $scope.modalShown = false;

        $scope.toggleIt = function(alertState) {
            alert(alertState);
        };
        //alert

        $scope.cancelAdd = function() {
            $scope.movie = '';
            $scope.alertMsg = "You canceled your Process.!!";
            $scope.modalShown = !$scope.modalShown;
        };

        $scope.addMovie = function() {
            if (!$scope.movie) {
                alert('Please enter Movie Name');
                return;
            } else {
                $scope.movieName = ($scope.movie).replace(/ /g, '+');
                console.log($scope.movieName);
                $scope.movieUrl = 'http://www.omdbapi.com/?t=' + $scope.movieName + '&y=&plot=short&r=json';
                movies.getMovieFromOMDB($scope.movieUrl).success(function(data) {
                    //here whatever data we get is just a raw data. We need to configure it with our database schema.
                    if (data.Response === 'False') {
                        alert($scope.movie + ' is Not available or You entere wrong Movie Name');
                        return;
                    }
                    var movieBody = {};
                    movieBody.Title = data.Title;
                    movieBody.Year = data.Year;
                    movieBody.Rated = data.Rated;
                    movieBody.Released = data.Released;
                    movieBody.Runtime = data.Runtime;
                    //http://stackoverflow.com/questions/281264/remove-empty-elements-from-an-array-in-javascript
                    //filter(boolean) for removing empty and false value


                    if (data.Genre === 'N/A' || data.Genre === '') {
                        movieBody.Genre = '';
                    } else {
                        movieBody.Genre = data.Genre.split(',').filter(Boolean);
                    }


                    if (data.Director === 'N/A' || data.Director === '') {
                        movieBody.Director = '';
                    } else {
                        movieBody.Director = data.Director.split(',').filter(Boolean);
                    }


                    if (data.Writer === 'N/A' || data.Writer === '') {
                        console.log('writer null');
                        movieBody.Writer = '';
                    } else {
                        console.log('writer not null');
                        movieBody.Writer = data.Writer.split(',').filter(Boolean);
                    }


                    if (data.Actors === 'N/A' || data.Actors === '') {
                        movieBody.Actors = '';
                    } else {
                        movieBody.Actors = data.Actors.split(',').filter(Boolean);
                    }


                    if (data.Plot === 'N/A' || data.Plot === '') {
                        movieBody.Plot = '';
                    } else {
                        movieBody.Plot = data.Plot;
                    }


                    if (data.Language === 'N/A' || data.Language === '') {
                        movieBody.Language = '';
                    } else {
                        movieBody.Language = data.Language.split(',').filter(Boolean);
                    }


                    if (data.Country === 'N/A' || data.Country === '') {
                        movieBody.Country = '';
                    } else {
                        movieBody.Country = data.Country.split(',').filter(Boolean);
                    }


                    if (data.Awards === 'N/A' || data.Awards === '') {
                        movieBody.Awards = '';
                    } else {
                        movieBody.Awards = data.Awards;
                    }

                    //make poster url update
                    if (data.Poster === 'N/A') {
                        movieBody.Poster = '';
                    } else {
                        var mp = (data.Poster).split('/');
                        var urlpart = mp[5];
                        urlpart = (urlpart).split('.');
                        urlpart[1] = urlpart[1].concat("_Al_.");
                        urlpart = urlpart[0].concat(".").concat(urlpart[1]).concat(urlpart[2]);
                        mp[5] = urlpart;
                        movieBody.Poster = mp[0].concat('//').concat(mp[2]).concat('/').concat(mp[3]).concat('/').concat(mp[4]).concat('/').concat(mp[5]);
                    }
                    //poster logic
                    if (data.Metascore === 'N/A') {
                        data.Metascore = 0;
                    }
                    movieBody.Metascore = data.Metascore;
                    if (data.imdbRating === 'N/A') {
                        data.imdbRating = 0;
                    }
                    movieBody.imdbRating = data.imdbRating;
                    if (data.imdbVotes === 'N/A') {
                        movieBody.imdbVotes = 0;
                    } else {
                        movieBody.imdbVotes = data.imdbVotes.replace(/,/g, '');
                    }
                    movieBody.imdbID = data.imdbID;
                    movieBody.Type = data.Type;
                    movieBody.Response = data.Response;
                    console.log(movieBody);
                    //now add this movie to our database
                    movies.addThisMovie(movieBody).success(function(data) {
                        $scope.alertMsg = "You added " + data.Title;
                        $scope.modalShown = true;
                        return true;
                    }).error(function(err) {
                        if (err.movie === 'available') {
                            $scope.alertMsg = "This Movie is Already Exists";
                            $scope.modalShown = true;
                            return;
                        } else {
                            $scope.alertMsg = "Something went wrong please try again";
                            $scope.modalShown = true;
                            return;
                        }
                    });

                }).error(function() {
                    alert($scope.movie + ' is Not available in Database');
                });
            }
        };
    }
]);

app.controller('navbarCtrl', [
    '$scope', 'userAuth', '$window',
    function($scope, userAuth, $window) {
        $scope.logout = function() {
            userAuth.destroySession();
        };
        $scope.checkUser = function() {
            var succ = userAuth.checkSession();
            if (succ === true) {
                $scope.Cuser = userAuth.currentUser;
                return true;
            }
            return false;
        };
    }
]);


app.controller('registerCtrl', [
    '$scope', '$http', 'userAuth',
    function($scope, $http, userAuth) {
        $scope.register = function() {
            if (!$scope.email || $scope.email === '' || !$scope.password || $scope.password === '') {
                return;
            }
            userAuth.addUser({
                password: $scope.password,
                user: $scope.email
            });
            $scope.email = '';
            $scope.password = '';
        };

    }
]);

app.controller('loginCtrl', [
    '$scope', '$http', 'userAuth',
    function($scope, $http, userAuth) {
        $scope.logIn = function() {
            if (!$scope.email || $scope.email === '' || !$scope.password || $scope.password === '') {
                return;
            }
            userAuth.getUser({
                password: $scope.password,
                user: $scope.email
            });
            $scope.email = '';
            $scope.password = '';
        };
    }
]);

app.directive('modalDialog', [function() {
    return {
        restrict: 'E',
        templateUrl: '/templates/alert.html',
        scope: {
            show: '=',
            close: '&'
        },
        replace: true,
        transclude: true,
        link: function(scope, element, attrs) {
            scope.dialogStyle = {};
            if (attrs.width)
                scope.dialogStyle.width = attrs.width;
            if (attrs.height)
                scope.dialogStyle.height = attrs.height;
        },
        controller: ['$scope', function($scope) {
            /* for confirmation hide
            $scope.hideModal = function() {
                var falseState="you closed it";
                $scope.close()(falseState);
                $scope.show = false;
            }*/
            //for alert
            $scope.hideModal = function() {
                $scope.show = false;
            };
        }]

    };
}]);


//here replace is not work with number so we change it to to string
app.filter('getRatingClass', function() {
    return function(input) {
        if (input !== null) {
            var inInt = parseInt(input);
            var frac = (input - Math.floor(input)).toString().slice(2, 3);
            if (frac <= 4) {
                frac = 0.0;
            } else {
                frac = 0.5;
            }
            input = inInt + frac;
            input = input.toString().replace('.', '-');
            console.log(input);
            return input.replace('.', '-');
        } else {
            return "0-0";
        }
    };
});
