"use strict"


/* Socket.io */
var socket = io.connect('/');
socket.on('new_guess', handle_new_guess);
socket.on('game_over', handle_game_over);

function amount_to_letter(amount) {
    /*
    Convert a transaction amount to a letter value
    */
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var val = amount % 100;
    if (val > 25) return null;
    else return letters[val];
}

function letter_to_amount(letter)
{
    /*
    Convert a letter value to a transaction amount
    */
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var guess_amount = parseInt($('#guess_amount').val());
    return guess_amount + letters.indexOf(letter);
}

function gen_addresses(account, amount)
{
    /*
    Given an account and amount, generate hyperlinks and qrcode deep links
    */
    const padding = '000000000000000000000000';
    return {
        qrcode: 'nano:' + account + '?amount=' + amount + padding,
        nanovault: 'https://nanovault.io/send?amount=' + (amount / 1000000) + '&to=' + account,
        ninjavault: 'https://vault.mynano.ninja/send?amount=' + (amount / 1000000) + '&to=' + account
    }
}

function handle_new_guess()
{
    /*
    Handle a new guess inbound
    */
    console.log("NEW GUESS");

    load_data();
}

function handle_game_over(data)
{
    /*
    Handle a game over inbound
    */
    console.log("GAME OVER");
    console.log(data);

    // Reset all guess letter buttons for new game
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var counter = 0;
    $('.letter-btn').each(function(i, obj) {
        $(this).prop('disabled', false);
        $(this).text(letters[counter]);
        counter += 1;
    });

    // Turn off guess overlay, show game over overlay, and get data for new game
    overlay_off();
    game_over_on(data.answer);
    load_data();
}

function overlay_on(guess)
{
    /*
    Turn on overlay to show guess information
    */
    $('#current_guess').val(guess);

    var addresses = gen_addresses($('#nano_account').val(), letter_to_amount(guess));
    var html = '';
    html += 'Wallets: <a href="' + addresses.qrcode + '" target="_new">Device Wallet</a> | <a href="' + addresses.nanovault + '" target="_new">NanoVault</a> | <a href="' + addresses.ninjavault + '" target="_new">NinjaVault</a>'
    $('#overlay_links').html(html);

    QRCode.toCanvas(document.getElementById('canvas'), addresses.qrcode, { 
        errorCorrectionLevel: 'L',
        color: {
        },
    }, function(error) {
        if (error) {
            console.error(error);
        }
    });
    $('#overlay_guess_letter').text(guess);
    $('#overlay_amount').text(letter_to_amount(guess) / 1000000);
    $('#qrcode_href').attr('href', addresses.qrcode);

    $('#overlay').show();
}

function overlay_off()
{
    /*
    Turn off guess overlay
    */
    $('#current_guess').val('');
    $('#overlay').hide();
}

function game_over_on(answer)
{
    /*
    Show game over overlay with answer
    */
    $('#game_over_answer').text(answer);
    $('#game_over').show();
}

function game_over_off()
{
    /*
    Turn off game over overlay
    */
    $('#game_over').hide();
}

function number_unique_letters_in_puzzle(puzzle)
{
    /*
    Calculate the number of unique letters in a given puzzle
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

function number_missing_letters_in_puzzle(puzzle)
{
    /*
    Calculate the number of missing letters in a given puzzle
    */
    var count = 0;
    for (var l in puzzle) {
        l = puzzle[l];
        if (l == '_') count += 1;
    }
    return count;
}

function calculate_prize_pool(puzzle, guesses)
{
    /*
    Calculate the current and project prize pools of the given guesses against the given puzzle
    Projected is calculated as if the only additional guesses are correct
    */
    var prize_pool_right = 0.0;
    var prize_pool_wrong = 0.0;
    for (var g in guesses) {
        g = guesses[g];
        if (puzzle.indexOf(amount_to_letter(g.amount)) < 0) {
            // Wrong guess
            prize_pool_wrong += (g.amount / 1000000)
        } else {
            prize_pool_right += (g.amount / 1000000);
        }
    }

    // Dev takes cut from wrong guesses
    var dev_cut = parseFloat($('#dev_cut').val());
    var prize_pool_current = prize_pool_right + (prize_pool_wrong*(1-dev_cut));

    var guess_amount = parseInt($('#guess_amount').val())
    var prize_pool_projected = prize_pool_current + number_missing_letters_in_puzzle(puzzle)*(guess_amount / 1000000);

    return {
        current: prize_pool_current,
        projected: prize_pool_projected
    }
}

function load_data()
{
    /*
    Send the request to the server to load game data
    If no argument is given, will load the most recent (active) game
    If argument given, will load that game
    */
    get_request('/game_data/' + $('#game_id').val(), function(xhr) {
        console.log(xhr);
        // guessed_letters, guesses, phrase
        var json = JSON.parse(xhr.responseText);
        var html = '';

        // Remove overlay if shown and has been guessed
        if (json.guessed_letters.indexOf($('#current_guess').val()) >= 0) overlay_off();

        // Update site data
        $('#nano_account').val(json.site.nano_account);
        $('#guess_amount').val(json.site.guess_amount);
        $('#dev_cut').val(json.site.dev_cut);

        // Rewrite phrase
        var rotate = '';
        html += '';
        for (var l in json.phrase) {
            l = json.phrase[l];
            var outline = '-outline';
            if (l != '_') outline = '';
            html += '<div class="p-1">';
            html += '<button type="button" class="btn btn' + outline + '-primary">';
            html += l;
            html += '</button>';
            html += '</div>';
        }
        $('#phrase_container').empty();
        $('#phrase_container').append(html);

        // Mark letters
        for (var l in json.guessed_letters) {
            l = json.guessed_letters[l];
            $('#letter_' + l).prop('disabled', true);
            $('#letter_' + l).html('&nbsp;');
        }

        // if game_id, it is archive, disable all letters
        if ($('#game_id').val().length > 0) {
            $('.letter-btn').prop('disabled', true);
        }

        // Update prize pool
        var prize_pool = calculate_prize_pool(json.phrase, json.guesses);
        $('#prize_pool').empty();
        $('#prize_pool').text('' + prize_pool.current.toFixed(6) + ' Nano');

        // Update players list
        // Generate array of players with guesses
        var players = [];
        for (var g in json.guesses) {
            g = json.guesses[g];

            var found = false;
            for (var p in players) {
                p = players[p];
                if (g.account_from == p.account) {
                    found = true;
                    p.letters.push(amount_to_letter(g.amount));
                }
            }
            if (!found) {
                players.push({
                    account: g.account_from,
                    letters: [amount_to_letter(g.amount)]
                });
            }
        }

        // Write the table for the players list
        html = '<table class="table table-hover">';
        html += '<thead>';
        html += '<tr><th>Nano Account</th><th>Letters Guessed</th><th>Projected Payout <a href="#" data-toggle="tooltip" data-placement="top" title="Projected payout is what you will receive if all the remaining letters are guessed correctly. If any incorrect guesses are made, your projected payout will increase!">(?)</a></th></tr>';
        html += '</thead>';
        html += '<tbody>';
        for (var p in players) {
            p = players[p];
            var correct_guesses = 0;
            for (var l in p.letters) {
                l = p.letters[l];
                if (json.phrase.indexOf(l) >= 0) correct_guesses += 1;
            }
            var payout_percent = correct_guesses / number_unique_letters_in_puzzle(json.phrase);
            html += '<tr><td class="text-truncate"><a href="https://nanocrawler.cc/explorer/account/' + p.account + '" target="_new">' + p.account + '</a></td><td>' + p.letters.join(', ') + '</td><td>' + (prize_pool.projected*payout_percent).toFixed(6) + ' Nano (' + (100*payout_percent).toFixed(2) + '%)</td></tr>';
        }
        html += '</tbody>';
        html += '</table>';

        $('#accounts_list').empty();
        $('#accounts_list').append(html);

        // Enable tooltips
        $('[data-toggle="tooltip"]').tooltip()


    });
}

function get_request(url, callback) {
    /*
    Generic function to send GET request
    */
    const method = 'GET';
    var xhr = new XMLHttpRequest({mozSystem: true});
    try {
        /* Because IE SUCKS! */
        xhr.timeout = 10 * 1000;
    } catch(err) {
        
    }

    if ("withCredentials" in xhr) {
        /* XHR for Chrome/Firefox/Opera/Safari. */
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined") {
        /* XDomainRequest for IE. */
        xhr = new XDomainRequest();
        xhr.timeout = 10 * 1000;
        xhr.open(method, url);
    } else {
        /* CORS not supported. */
        xhr = null;
    }

    xhr.send();

    xhr.onreadystatechange=function() {
        if (this.readyState==4 && this.status==200) {
            callback(xhr);
        } else if (this.readyState==4) {
            console.error('Attempted ' + url + ' has status ' + this.status);
        }
    }
}

$(document).ready(load_data());