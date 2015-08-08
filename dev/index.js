import PhyloCanvas from 'PhyloCanvas';
import metadataPlugin from '../src/index';

PhyloCanvas.plugin(metadataPlugin);

const tree = PhyloCanvas.createTree('phylocanvas');

tree.on('error', function (event) { throw event.error; });

tree.on('loaded', function () {
  console.log('loaded');
  for (let i = 0; i <= 12; i++) {
    if (tree.leaves[i]) {
      tree.leaves[i].data = { col: 1, x: 0, a: 1, c: 0 };
    }
  }
  tree.viewMetadataColumns();
});

tree.load('(A:0.1,B:0.1,(C:0.1,D:0.1):0.1);');
