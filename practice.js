// https://stackoverflow.com/questions/43601414/recursive-promises-to-create-tree

const tree = {
	value: 1,
	children: [{
		value: 2,
		children: [{
			value: 4,
			children: []
		}]
	}, {
		value: 3,
		children: []
	}]
};

const sumChildren = children => {
	console.log("sumChildren", children.length);
	if (children.length === 0) {
		return 0;
	}
	let summedChildren = children.map(sumNode);

	console.log(summedChildren);

	return summedChildren.reduce((x, y) => x + y, 0);
}

const sumNode = node => {
	console.log("sumNode", node.value);
	return node.value + sumChildren(node.children);
}

const total = sumNode(tree);

console.log(total);