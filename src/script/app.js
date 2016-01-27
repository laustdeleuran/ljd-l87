/* @file script/app */
'use strict';



// Modernizr (https://www.npmjs.org/package/browsernizr, https://github.com/jnordberg/browsernizr)
require('browsernizr/test/css/transforms');
require('browsernizr');



// Data
var data = require('../data/l87.json');
var Chart = require('chart.js');
var _ = require('lodash');



// Doc ready
document.addEventListener('DOMContentLoaded', function() {



	// Result graph
	(function(resultGraphId, noShowGraphId) {
		var options = {
			animationEasing: "easeOutQuart",
			segmentStrokeColor: '#232323',
			segmentStrokeWidth: 2,
		};

		var voteFor, voteAgainst, noVote, noShow;
		voteFor = voteAgainst = noVote = noShow = 0;
		for (var i = 0; i < data.votes.length; i++) {
			switch (data.votes[i][2]) {
				case 1:
					voteFor++;
					break;
				case -1:
					voteAgainst++;
					break;
				case 0:
					noVote++;
					break;
				case null:
					noShow++;
					break;
			}
		}

		new Chart(document.getElementById(resultGraphId).getContext('2d')).Pie([
			{
				value: voteFor,
				color: '#F7464A',
				highlight: '#FF5A5E',
				label: 'For'
			}, {
				value: voteAgainst,
				color: '#46BFBD',
				highlight: '#5AD3D1',
				label: 'Imod'
			}, {
				value: noVote,
				color: '#FDB45C',
				highlight: '#FFC870',
				label: 'Stemte hverken for eller imod'
			}
		], options);

		new Chart(document.getElementById(noShowGraphId).getContext('2d')).Pie([
			{
				value: voteFor + voteAgainst + noVote,
				color: '#46BFBD',
				highlight: '#5AD3D1',
				label: 'Stemte'
			}, {
				value: noShow,
				color: '#F7464A',
				highlight: '#FF5A5E',
				label: 'Stemte ikke'
			}
		], options);
	}('js-result', 'js-noshow'));



	// MP list
	(function(listId, searchId) {
		var list = document.getElementById(listId),
			search = document.getElementById(searchId);

		// Decorate data for search
		for (var i = 0; i < data.votes.length; i++) {
			data.votes[i].push(data.parties[data.votes[i][0]] || data.votes[i][0]);
		}


		function render(votes) {
			var items = '',
				vote, partyCode, party, name, photo;
			for (var i = 0; i < votes.length; i++) {
				partyCode = votes[i][0];
				name = votes[i][1];
				vote = votes[i][2];
				photo = votes[i][3];
				party = votes[i][4];

				switch (vote) {
					case 1:
						vote = 'For';
						break;
					case -1:
						vote = 'Imod';
						break;
					case 0:
						vote = 'Stemte hverken for eller imod';
						break;
					case null:
						vote = 'Fraværende';
						break;
				}
				items += '<li class="c-mp-list__item c-mp-list__item--' + partyCode + '" tabindex="-1"><img class="c-mp-list__img" src="' + photo + '" alt="' + name + ', ' + partyCode + '" /><h1 class="c-mp-list__title">' + name + '<br/>' + party + '</h1><article class="c-mp-list__info">' + vote + '</article></li>';
			}
			list.innerHTML = items;
		}

		render(data.votes);


		search.addEventListener('keyup', function() {
			var val = this.value.toLowerCase(),
				filteredData = _.filter(data.votes, function(vote) {
					if (val.length < 3) {
						return vote[0].toLowerCase().indexOf(val) > -1;
					} else {
						return vote[1].toLowerCase().indexOf(val) > -1 || vote[4].toLowerCase().indexOf(val) > -1;
					}
				});
			render(filteredData);
		}, false);
	}('js-mp-list', 'js-mp-list-search'));



});