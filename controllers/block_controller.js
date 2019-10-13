'use strict';

var server = require('../bin/www');
var async = require('async');
var request = require('request');

var Guess = require('../models/guess.js');
var Game = require('../models/game.js');
var Site = require('../models/site.js');
var Config = require('../config/words.js');
var Phrase = require('../models/phrase.js');
var Utility = require('../utility/words.js');

exports.new_block = async function(req, res) {
    /* 
    Handle new inbound block
    */

    res.sendStatus(200);

    const fullBlock = req.body;

    try {
        /*
        {
        "hash":"639983283F3EC39290D23312DCAA5A44D04CB699466F9CA1853AF36208FA02C3",
        "address":"xrb_3pag75gcfcny69zotqij8b6jmcbo8hozcogbyqwuuy9spg5kisocowicx9e4",
        "confirmationNo": 1,
        "sender": "nano_1nanoteiu8euwzrgqnn79c1fhpkeuzi4b4ptogoserckbxkw15dma6dg5hb5",
        "amount":10000,
        }
        */
        console.log("Block received!");
        console.log(fullBlock);

        // Validate block
        if (!fullBlock.hash || !fullBlock.address || !fullBlock.sender || !fullBlock.amount) {
            console.error("Invalid block, missing fields");
            console.error(fullBlock);
            return;
        }

        Site.find({}, async function(err, site_results) {
            var site = site_results[0];

            // Check for valid amount
            if (fullBlock.amount < site.guess_amount || fullBlock.amount > site.guess_amount+25) {
                console.error('Invliad transaction amount');
                console.error(fullBlock);
                return;
            }

            Game.findOne({}, {}, {sort: { 'date_created': -1 } }, function(err, game_results) {

                // Make sure guess doesn't exist
                Guess.find({game: game_results._id, amount: fullBlock.amount}, function(err, results) {
                    if (err) {
                        console.error('Error making sure game guess doesnt exist...');
                        console.error(err);
                        return;
                    }

                    // Duplicate guess! Send it back (not priority)
                    if (results.length > 0) {
                        console.log('Duplicate guess!')
                        Utility.queue_transaction(fullBlock.address, fullBlock.sender, fullBlock.amount, false);
                        return;
                    }

                    var guess = new Guess({
                        _id: fullBlock.hash,
                        game: game_results._id,
                        account_from: fullBlock.sender,
                        amount: fullBlock.amount
                    });

                    guess.save(function(error) {
                        if (error) {
                            console.error('Error saving guess to db: ' + error);
                            console.error(guess);
                        } else {
                            server.io.emit('new_guess', {});

                            // Check if game is over
                            Guess.find({game: game_results._id}, function(err, game_guesses) {
                                
                                // Aggregate guessed letters
                                var guessed_letters = [];
                                for (var guess of game_guesses) {
                                    guessed_letters.push(Utility.amount_to_letter(guess.amount));
                                }

                                // Build guessing phrase with '_' as missing letters
                                var phrase = "";
                                for (var letter of game_results.phrase) {
                                    if (guessed_letters.includes(letter) || guessed_letters.includes(letter.toUpperCase()) || letter == " ") {
                                        phrase = phrase.concat(letter);
                                    } else {
                                        phrase = phrase.concat("_");
                                    }
                                }

                                // Check if all letters in phrase have been guessed
                                if (phrase.indexOf('_') < 0) {
                                    // Game complete
                                    Utility.create_new_game(function() {
                                        server.io.emit('game_over', {'answer': phrase});
                                    });
                                    Utility.send_prizes(game_guesses, game_results.phrase);
                                }
                            });
                        }
                    });
                });

                
            });
        });

        

    } catch (err) {
        console.error('Error parsing block data! ', err.message);
        return;
    }
}

