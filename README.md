# phylocanvas-plugin-metadata
Display metadata blocks adjacent to tree leaves.

## Usage
```
npm install phylocanvas phylocanvas-plugin-metadata
```
```javascript
import Phylocanvas from 'phylocanvas';
import metadataPlugin from 'phylocanvas-plugin-metadata';

Phylocanvas.plugin(metadataPlugin);

const tree = Phylocanvas.createTree('id', {
  metadata: {
    show: false,
    blockLength: 20,
    blockSize: 200,
    padding: 0,
    selectedColumns: [],
  }
})

tree.on('loaded', function () {
  // add metadata to leaves
  for (const leaf of tree.leaves) {
    leaf.data = {
      columnA: 'value',
      columnB: true,
      columnC: 10,
    };
  }
  tree.viewMetadataColumns();
  tree.draw();
});
```

## Options

A list of available options:
* `show`: A boolean flag to show or hide the metadata blocks on the tree.
* `blockLength`: The length of each block is treated as:
  * the width of the block on `rectangular` and `diagonal` trees,
  * the height of the block on `hierarchical` trees,
  * the width of the block on `circular` and `radial` trees.
* `blockSize`: The size of each block is treated as:
  * the height of the block on `rectangular` and `diagonal` trees,
  * the width of the block on `hierarchical` trees,
  * the height of the block on `circular` and `radial` trees.
* `padding`: The padding between the metadata blocks. The default value is `0`.
* `selectedColumns`: an array of column names to be displayed on the tree. The default value is an empty array which displays all columns.
