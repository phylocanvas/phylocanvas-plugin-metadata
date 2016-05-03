import PhyloCanvas, * as phyloComponents from 'phylocanvas';
import metadataPlugin from '../src/index';

PhyloCanvas.plugin(metadataPlugin);

function getRandomColor() {
  return '#'+Math.random().toString(16).slice(-6);
}

const numberOfColumns = 8; // parseInt(Math.random() * 10) + 1;

const tree = PhyloCanvas.createTree('phylocanvas', {
  padding: 1,
});

// create buttons
const buttonForm = document.getElementById('buttons');
for (const treeType of Object.keys(phyloComponents.treeTypes)) {
  const button = document.createElement('button');
  button.innerHTML = treeType;
  button.addEventListener('click', tree.setTreeType.bind(tree, treeType));
  buttonForm.appendChild(button);
}

tree.on('error', function (event) { throw event.error; });

tree.on('loaded', function () {
  console.log('loaded');
  for (let i = 0; i <= 12; i++) {
    if (tree.leaves[i]) {
      tree.leaves[i].data = {};
      for (let j = 0; j < numberOfColumns; j++) {
        tree.leaves[i].data[`col_${j}`] = getRandomColor();
      }
    }
  }
  tree.viewMetadataColumns();
});

tree.alignLabels = true;
tree.setTreeType('rectangular');

const originalDraw = tree.draw;
tree.draw = (...args) => {
  originalDraw.apply(tree, args);
  const bounds = tree.getBounds();
  tree.canvas.strokeRect(bounds[0][0], bounds[0][1], bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]);
};

tree.load('(A:0.1,B:0.1,(C:0.1,D:0.1):0.1);');
