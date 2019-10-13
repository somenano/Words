var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var GuessSchema = new Schema({
    _id: { // block hash
        type: String,
        required: true
    },
    game: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'game',
        required: true
    },
    account_from: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
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
module.exports = mongoose.model('guess', GuessSchema);