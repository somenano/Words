var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var PhraseSchema = new Schema({
    phrase: {
        type: String,
        required: true
    }
});

// Virtual

// Export model
module.exports = mongoose.model('phrase', PhraseSchema);