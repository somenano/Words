'use strict';

var server = require('../bin/www');
var async = require('async');
var request = require('request');

var Guess = require('../models/guess.js');
var Game = require('../models/game.js');
var Site = require('../models/site.js');
var Config = require('../config/words.js');
var Phrase = require('../models/phrase.js');

exports.get_game_data = async function(game_id) {
    /*
    Returns game data for game_id
    */
    var search = {};
    if (game_id) {
        search = {
            _id: game_id
        }
    }
    var game = null;
    var guesses = [];

    return new Promise((resolve, reject) => {

        Site.find({}, function(err, site_results) {
            Game.findOne(search, {}, {sort: { 'date_created': -1 } }, function(err, results) {
                if (err) {
                    console.error('Error getting game data. game_id: ' + game_id);
                    console.error(err);
                    resolve({
                        success: "false"
                    });
                }

                game = results;
                Guess.find({game: game}, function(err, guess_results) {
                    guesses = guess_results;
                    var guessed_letters = [];
                    for (var guess of guesses) {
                        guessed_letters.push(exports.amount_to_letter(guess.amount));
                    }

                    var phrase = "";
                    for (var letter of game.phrase) {
                        if (guessed_letters.includes(letter) || guessed_letters.includes(letter.toUpperCase()) || letter == " ") {
                            phrase = phrase.concat(letter);
                        } else {
                            phrase = phrase.concat("_");
                        }
                    }

                    var game_data = {
                        success: true,
                        site: site_results[0],
                        guessed_letters: guessed_letters,
                        phrase: phrase,
                        guesses: guesses,
                    };

                    if (!game_id) {
                        // Update cache for current game
                        server.game_data_cache = game_data;
                    }

                    resolve(game_data);
                });
            });
        });
    });
}

exports.create_new_game = function(callback) {
    /*
    Create a new game
    */

    // Get the count of all phrases
    Phrase.count().exec(function (err, count) {

        // Get a random phrase
        var random = Math.floor(Math.random() * count);

        Phrase.findOne().skip(random).exec(function(err, result) {
            var game = new Game({
                phrase: result.phrase
            });

            // Save new game with randomly selected phrase
            game.save(async function(error) {
                if (error) {
                    console.error('Error saving new game... ' + error);
                }
                // Setup cache
                await exports.get_game_data(null);

                return callback();
            });
        });
    });

}

exports.number_unique_letters_in_puzzle = function(puzzle)
{
    /*
    Return the number of unique letters in given puzzle
    */
    var letters = [];
    const alph = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var blank_count = 0;
    for (var l in puzzle) {
        l = puzzle[l];
        if (l == '_') {
            blank_count += 1;
            continue;
        }
        if (alph.indexOf(l) < 0) continue;
        if (letters.indexOf(l) < 0) letters.push(l);
    }

    return letters.length + blank_count;
}

exports.amount_to_letter = function(amount) {
    /*
    Convert the amount sent in a transaction to a letter
    */
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var val = amount % 100;
    if (val > 25) return null;
    else return letters[val];
}

exports.calculate_prize_pool = function(puzzle, guesses, dev_cut)
{
    /*
    Calculate the total prize pool from all the guesses minus dev cut
    */
    var prize_pool_right = 0.0;
    var prize_pool_wrong = 0.0;
    for (var g in guesses) {
        g = guesses[g];
        if (puzzle.indexOf(exports.amount_to_letter(g.amount)) < 0) {
            // Wrong guess
            prize_pool_wrong += (g.amount / 1000000)
        } else {
            prize_pool_right += (g.amount / 1000000);
        }
    }

    // Dev takes cut from wrong guesses
    var prize_pool_current = prize_pool_right + (prize_pool_wrong*(1-dev_cut));

    return prize_pool_current;
}

exports.queue_transaction = function(account_from, account_to, amount, priority)
{
    /*
    Queue a transaction to be sent
    TODO: add ability to queue a priority transaction
    */
    var data = {
        "to": account_to,
        "from": account_from,
        "amount": amount,
        "password": Config.wallet_pass
    }

    var options = {
        url: 'https://snapy.io/api/v1/send',
        headers: {
            'x-api-key': Config.snapy_key,
            'Content-type': 'Application/json'
        },
        method: 'post',
        body: data,
        json: true
    }

    console.log('Added transaction to queue: Send ' + data.amount/1000000 + ' Nano from ' + data.from + ' to ' + data.to);
    if (priority) {
        server.send_queue.unshift(options)
    } else {
        server.send_queue.push(options);
    }
    
}

exports.send_prizes = function(guesses, phrase) {

    /*
    Calculate and send a prize at the end of a game
    */

    Site.find({}, async function(err, site_results) {
        var site = site_results[0];
        var prize_pool = exports.calculate_prize_pool(phrase, guesses, site.dev_cut);

        // Get list of players from guesses
        var players = [];
        for (var g in guesses) {
            g = guesses[g];

            var found = false;
            for (var p in players) {
                p = players[p];
                if (g.account_from == p.account) {
                    found = true;
                    p.letters.push(exports.amount_to_letter(g.amount));
                }
            }
            if (!found) {
                players.push({
                    account: g.account_from,
                    letters: [exports.amount_to_letter(g.amount)]
                });
            }
        }

        // Iterate over each player and send payout
        for (var p in players) {
            p = players[p];
            var correct_guesses = 0;
            for (var l in p.letters) {
                l = p.letters[l];
                if (phrase.indexOf(l) >= 0) correct_guesses += 1;
            }
            var payout_percent = correct_guesses / exports.number_unique_letters_in_puzzle(phrase);

            // Send prize_pool * payout_percent to p.account
            console.log('Sending ' + (prize_pool*payout_percent) + ' Nano to ' + p.account);
            try {
                // queue the transaction as priority
                const success = exports.queue_transaction(site.nano_account, p.account, Math.floor((prize_pool*payout_percent)*1000000), true);
            } catch(err) {
                console.error('Error sending transaction');
                console.error(err);
            }
        }
    });
}