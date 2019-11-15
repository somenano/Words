var async = require('async');
var Game = require('../models/game.js');
var Phrase = require('../models/phrase.js');
var Guess = require('../models/guess.js');
var Site = require('../models/site.js');
var Config = require('../config/words.js');
var Utility = require('../utility/words.js');
var server = require('../bin/www');

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

exports.what = async function(req, res) {
	var game_data = await Utility.get_game_data(null);
	return res.json( {
		'game_data': game_data,
		'game_data_cache': server.game_data_cache 
	});
}

exports.game_data = async function(req, res) {
    /*
    Return json data of given game (game_id or current)
    */
    var game_id = req.params.game_id;

    if (game_id || Object.keys(server.game_data_cache).length == 0) {
        // Generate game_data from database
        console.log('Returning database game data');
        var ret = await Utility.get_game_data(game_id);
        return res.json( ret );;
    }

    // Return cached game_data
    console.log('Returning cached game data');
    return res.json( server.game_data_cache );
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
