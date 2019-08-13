const example = [...'hello world'];

// const wait = ms => new Promise((resolve) => setTimeout(resolve, ms));

const getSentenceFragment = async function(sentence, offset = 0) {
	// console.log(sentence, offset);
	const pageSize = 3;

	//await wait(500);

	return {
		data: sentence.slice(offset, offset + 3),
		nextPage: offset + 3 < sentence.length ? offset + 3 : undefined
	};
};

const getSentence = async function(sentence, offset = 0) {
	const fragment = await getSentenceFragment(sentence, offset)
	if (fragment.nextPage) {
		let awaited = await getSentence(sentence, fragment.nextPage);
		return fragment.data.concat(awaited);
	} else {
		return fragment.data;
	}
}

const getResult = async function(cb) {
	let result = await getSentence(example);
	cb(result);
}

getResult(function(test) {
	console.log(test);	
});

