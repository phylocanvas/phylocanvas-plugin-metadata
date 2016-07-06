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
    active: true,
    showHeaders: true,
    showLabels: true,
    blockLength: 32,
    blockSize: null,
    padding: 8,
    columns: [],
    propertyName: 'data',
    underlineHeaders: true,
    headerAngle: 90,
    fillStyle: 'black',
    strokeStyle: 'black',
    lineWidth: 1,
    font: null,
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
* `active`: A boolean flag to show or hide the metadata blocks on the tree. The default value is `true`.
* `showHeaders`: A boolean flag to show or hide header labels. The default value is `true`.
* `showLabels`: A boolean flag to show or hide block labels. The default value is `true`.
* `blockLength`: The length of each block is treated as:
  * the width of the block on `rectangular` and `diagonal` trees,
  * the height of the block on `hierarchical` trees,
  * the width of the block on `circular` and `radial` trees.
* `blockSize`: The size of each block is treated as:
  * the height of the block on `rectangular` and `diagonal` trees,
  * the width of the block on `hierarchical` trees,
  * the height of the block on `circular` and `radial` trees.
* `padding`: The padding between the metadata blocks. The default value is `0`.
* `columns`: An array of column names to be displayed on the tree. The default value is an empty array which displays all columns.
* `propertyName`: The name of the property on the branch object which contains the metadata values. The default value is `'data'`.
* `headerAngle`: An angle (in degrees) to rotate the header labels. The default value is `90` degrees.
* `underlineHeaders`: A boolean flag to draw a line under header labels. The default value is `false`.
* `fillStyle`: A valid stroke style (https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/fillStyle) to be used when drawing. The default value is `'black'`.
* `strokeStyle`: A valid stroke style (https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeStyle) to be used when drawing. The default value is `'black'`.
* `lineWidth`: The line width used for drawing lines under header labels. The default value is `1`.
* `font`: A valid CSS font value (https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/font) to be used for header and block labels. When a `null` is set as font, the values of `tree.textSize` and `tree.font` will be used. The default value is `null`.
