var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var SiteSchema = new Schema({
    dev_cut: {
        type: Number,
        required: true
    },
    guess_amount: {
        type: Number,
        required: true
    },
    nano_account: {
        type: String,
        required: true
    }
});

// Virtual

// Export model
module.exports = mongoose.model('site', SiteSchema);