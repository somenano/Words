var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var GameSchema = new Schema({
    phrase: {
        type: String,
        required: true
    },
    date_created: {
        type: Date,
        default: Date.now,
        required: true
    }
});

// Virtual

// Export model
module.exports = mongoose.model('game', GameSchema);