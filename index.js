const fs = require('fs');
const async = require('async');

const WordPOS = require('wordpos');
const wordpos = new WordPOS();

const dsv = require('d3-dsv');

// https://wordnet.princeton.edu/documentation/wninput5wn
const pointer_types = require('./pointer_types.json');

const pointers = require('./samples/pointers.json');
const synsets = require('./samples/cream.json');

let flatten = function(array) {
	let output = [];
	for (let i = 0; i < array.length; i += 1) {
		if (Array.isArray(array[i])) {
			output = output.concat(flatten(array[i]));
		} else {
			output.push(array[i]);
		}
	}
	return output;
}

function getSample(word) {
	wordpos.lookupNoun(word).then(synsets => {
		fs.writeFileSync(`./samples/${ word }.json`, JSON.stringify(synsets, null, 2));		
	});
}

// return a promise getting a word's synsets
async function getWord(word) {
	return promise = new Promise((resolve, reject) => {
		wordpos.lookupNoun(word).then(synsets => {
			resolve(synsets);
		});
	});
}

// return a Promise getting a pointer
async function getPointer(pointer) {
	return wordpos.seek(pointer.synsetOffset, pointer.pos).then(synset => {
		return synset;
	});
}

// For a single synset (many words return several if there are alternate meanings),
// find the pointers of a given type and return the words and their synsets
async function getPointers(synset, pointer_type) {
	return new Promise((resolve, reject) => {
		let origin = synset.lemma;
		let symbol = pointer_types[pointer_type];
		let pointers = synset.ptrs.filter(d => {
			return d.pointerSymbol === symbol;
		});
		let results = [];

		if (pointers.length == 0) {
			resolve(null);
		}

		let promises = pointers.map(d => {
			return getPointer(d);
		});

		resolve(Promise.all(promises));

		/*
		async.eachSeries(pointers, function(pointer, cb) {
			let synset = await getPointer(pointer);
			results.push(synset);
			cb();
			wordpos.seek(pointer.synsetOffset, pointer.pos).then(synset => {
				//console.log(synset.lemma)
				results.push(synset);
				cb();
			});
		}, function() {
			resolve(results);
		});
		*/
	});
}

// Above function for groups of synsets
function getPointersBySynsets(synsets, pointer_type) {
	let result_pairs = [];

	return new Promise((resolve, reject) => {
		async.each(synsets, function(synset, cb) {
			let origin = synset.lemma;
			let definition = synset.def;
			let synonyms = synset.synonyms;
			let id = synset.synsetOffset;

			getPointers(synset, pointer_type, function(results) {
				result_groups.push({
					origin: origin,
					origin_id: id,
					synonyms: synonyms,
					definition: definition.trim(),
					relationship: pointer_type,
					child_words: results ? results.map(d => { return d.lemma; }) : null,
					child_synsets: results || null
				});
				cb();
			});
		}, function() {
			resolve(result_pairs);
		});
	});
}


var pointerGroup = [];

function getSynsetsPointersByTypeRecursive(synsets, pointer_type, callback, depth) {
	if (!depth) {
		depth = 0;
	}

	console.log("DEPTH", depth);

	if (depth === 0) {
		synsets.forEach(synset => {
			pointerGroup.push({
				source: synset.lemma,
				target: null,
				source_id: synset.synsetOffset,
				target_id: null,
				relationship: "self",
				depth: depth,
				definition: synset.def.trim()
			});			
		});
	}

	getSynsetsPointersByType(synsets, pointer_type, function(results) {
		if (!results || results.length === 0) {
			callback();
			return;
		}

		let cbs = 0;

		results.forEach(result => {
			// console.log(result.origin, synset.lemma, depth);
			if (result.child_synsets) {
				result.child_synsets.forEach(synset => {
					pointerGroup.push({
						source: result.origin,
						target: synset.lemma,
						source_id: result.origin_id,
						target_id: synset.synsetOffset,
						relationship: pointer_type,
						depth: depth
					});					
				});
				getSynsetsPointersByTypeRecursive(result.child_synsets, pointer_type, callback, depth + 1);
				cbs += 1;
			}
		});
		if (cbs == 0) {
			callback();
		}
	});	
}


function getHypernyms(word, callback) {
	let word_data = {
		word: word,
		definitions: []
	};

	wordpos.lookupNoun(word, synsets => {
		getSynsetsPointersByTypeRecursive(synsets, "hypernym", function() {
			callback(pointerGroup);
		});

		/*
		getSynsetsPointersByType(synsets, "hyponym", function(results) {
			if (results.length === 0) {
				callback(null);
			} else {
				callback(results);
			}
		});
		*/

	});
}


async function test(arg) {
	// let r = await getWord(arg);
	// console.log(JSON.stringify(r, null, 2));
	let r = await getPointers(arg, "hypernym");
	console.log(JSON.stringify(r, null, 2));
};

test(synsets[1]);
