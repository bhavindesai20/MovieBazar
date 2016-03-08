var mongoose = require('mongoose');

var FavouriteSchema = new mongoose.Schema({
    userId: String,
    favourite: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'movies'
    }
});

mongoose.model('Favourite', FavouriteSchema);