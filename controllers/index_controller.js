var async = require('async');
var Game = require('../models/game.js');
var Phrase = require('../models/phrase.js');
var Guess = require('../models/guess.js');
var Site = require('../models/site.js');
var Config = require('../config/words.js');
var Utility = require('../utility/words.js');

var request = require('request');


exports.index = function(req, res) {
    /*
    Show the game page
    If no game_id, will show current game.  If game_id given, will show that game.
    */

    var game_id = req.params.game_id;
    var title = 'SomeNano Words';
    if (!game_id) {
        game_id = "";
    } else {
        title = title.concat(' | Archive | ' + game_id);
    }

    var game = null;
    var guesses = [];

    Site.find({}, function(err, site_results) {
        return res.render('index', {
            title: title,
            site: site_results[0],
            game_id: game_id
        });
    });

}

exports.game_data = function(req, res) {
    /*
    Return json data of given game (game_id or current)
    */
    var game_id = req.params.game_id;
    var search = {};
    if (game_id) {
        search = {
            _id: game_id
        }
    }
    var game = null;
    var guesses = [];
    Site.find({}, function(err, site_results) {
        Game.findOne(search, {}, {sort: { 'date_created': -1 } }, function(err, results) {
            if (err) {
                console.error('Error getting game data. game_id: ' + game_id);
                console.error(err);
                return res.json({
                    success: "false"
                });
            }

            game = results;
            Guess.find({game: game}, function(err, guess_results) {
                guesses = guess_results;
                var guessed_letters = [];
                for (guess of guesses) {
                    guessed_letters.push(Utility.amount_to_letter(guess.amount));
                }

                var phrase = "";
                for (letter of game.phrase) {
                    if (guessed_letters.includes(letter) || guessed_letters.includes(letter.toUpperCase()) || letter == " ") {
                        phrase = phrase.concat(letter);
                    } else {
                        phrase = phrase.concat("_");
                    }
                }

                return res.json({
                    success: true,
                    site: site_results[0],
                    guessed_letters: guessed_letters,
                    phrase: phrase,
                    guesses: guesses,
                });
            });
        });
    });
}

exports.archive = function(req, res) {
    /*
    Show archived games
    */

    Game.find({}).sort({ 'date_created': -1 }).limit(101).exec(function(err, results) {
        results.shift();    // remove currect game
        return res.render('archive', {
            title: 'SomeNano Words | Archive',
            games: results
        })
    });
}