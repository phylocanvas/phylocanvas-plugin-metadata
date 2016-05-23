import PhyloCanvas, { Tree, Branch, utils } from 'phylocanvas';

const { constants } = utils;
const { Angles } = constants;

function isCircularTree(tree) {
  return tree.treeType === 'circular' || tree.treeType === 'radial';
}

Tree.prototype.viewMetadataColumns =
  function (metadataColumnArray = this.getMetadataColumnHeadings()) {
    this.metadata.show = true;
    this.metadata.selectedColumns = metadataColumnArray;
    // Fit to canvas window
    this.fitInPanel();
    this.draw();
  };

Tree.prototype.getMetadataColumnHeadings = function () {
  for (const leaf of this.leaves) {
    const keys = Object.keys(leaf.data);
    if (keys.length > 0) {
      return keys;
    }
  }
  return [];
};

Tree.prototype.hasMetadataHeadings = function () {
  return this.treeType === 'diagonal' || (this.alignLabels &&
    this.treeType === 'rectangular' || this.treeType === 'hierarchical');
};

Tree.prototype.getMetadataLength = function () {
  return this.baseNodeSize * 2 + this.metadata.padding +
         this.getMetadataColumnHeadings().length * this.metadata.blockLength;
};

Tree.prototype.getMetadataHeadingLength = function () {
  let maxSize = 0;
  if (this.hasMetadataHeadings()) {
    const fontSize = Math.min(this.textSize, this.metadata.blockLength);
    this.canvas.font = `${fontSize}px Sans-serif`;
    for (const colName of this.metadata.selectedColumns) {
      maxSize = Math.max(maxSize, this.canvas.measureText(colName).width + 20);
    }
  }
  return maxSize;
};

Tree.prototype.getMetadataMaxBlockSize = function () {
  if (this.metadata.maxBlockSize) {
    return this.metadata.maxBlockSize;
  }

  // the max block size of circular trees is the max angle in pixels
  if (isCircularTree(this)) {
    let maxHypot = 0;
    for (const lf of this.leaves) {
      let tx = lf.getLabelStartX();
      if (this.showLabels || (this.hoverLabel && lf.highlighted)) {
        tx += this.maxLabelLength[this.treeType];
      }
      const offset = this.alignLabels ? this.labelAlign.getLabelOffset(lf) : 0;
      const hypot = Math.hypot(lf.centerx - lf.startx, lf.centery - lf.starty) +
                    tx + offset;
      if (hypot > maxHypot) maxHypot = hypot;
    }
    this.metadata.maxBlockSize = Angles.FULL * maxHypot / this.leaves.length;
    return this.metadata.maxBlockSize;
  }

  // the max block size for non-circular trees is equal to the tree step
  return this.step;
};

Tree.prototype.clearMetadata = function () {
  for (const leaf of this.leaves) {
    leaf.data = {};
  }
};

Branch.prototype.drawMetadata = function () {
  const tree = this.tree;

  // set initial x and y coordinates
  let tx = this.getLabelStartX();
  let ty = 0;

  if (tree.showLabels || (tree.hoverLabel && this.highlighted)) {
    tx += tree.maxLabelLength[tree.treeType];
  }

  // makes sure that the block size is not greater than tree step or max angle
  const maxSize = tree.getMetadataMaxBlockSize();
  const size = Math.min(maxSize, tree.metadata.blockSize);

  // remove padding from the block length
  const length = tree.metadata.blockLength - tree.metadata.padding;

  // add padding to both x and y axis
  if (tree.alignLabels) {
    tx += tree.labelAlign.getLabelOffset(this);
  }
  tx += tree.metadata.padding * 2;
  ty = ty - (size / 2);

  // draw column headers
  if (!tree.metadata.headingDrawn && tree.hasMetadataHeadings()) {
    this.drawMetadataHeading(tx, size * 1.5);
    tree.metadata.headingDrawn = true;
  }

  if (Object.keys(this.data).length > 0) {
    this.canvas.beginPath();

    // If no columns specified, then draw all columns
    const metadata = (tree.metadata.selectedColumns.length > 0) ?
                     tree.metadata.selectedColumns :
                     Object.keys(this.data);

    let i = 1;
    const stepCorrection =
      isCircularTree(tree) && tree.alignLabels ?
        Angles.FULL * length / tree.leaves.length :
        0;
    for (const columnName of metadata) {
      if (typeof this.data[columnName] !== undefined) {
        this.canvas.fillStyle = this.data[columnName];
        this.canvas.fillRect(tx, ty, length, size + i * stepCorrection);
      }
      tx += tree.metadata.blockLength;
      i++;
    }
    this.canvas.stroke();
    this.canvas.closePath();
  }
};

Branch.prototype.drawMetadataHeading = function (x, y) {
  const { treeType } = this.tree;
  const metadata = (this.tree.metadata.selectedColumns.length > 0) ?
                   this.tree.metadata.selectedColumns :
                   Object.keys(this.data);

  // Drawing Column headings
  const fontSize = Math.min(this.tree.textSize, this.tree.metadata.blockLength);
  this.canvas.font = `${fontSize}px Sans-serif`;
  this.canvas.fillStyle = 'black';
  this.canvas.textBaseline = 'middle';

  let tx = x;
  tx += (this.tree.metadata.blockLength - this.tree.metadata.padding) / 2;

  // Rotate canvas to write column headings
  this.canvas.rotate(-Math.PI / 2);

  for (const columnName of metadata) {
    this.canvas.textAlign = (treeType === 'hierarchical') ? 'right' : 'left';
    this.canvas.fillText(columnName, treeType === 'hierarchical' ? -y : y, tx);
    tx += this.tree.metadata.blockLength;
  }

  // Rotate canvas back to normal position
  this.canvas.rotate(Math.PI / 2);
};

export default function metadataPlugin(decorate) {
  decorate(PhyloCanvas, 'createTree', function (delegate, args) {
    const tree = delegate(...args);

    tree.metadata = Object.assign({}, {
      show: false,
      blockLength: 20,
      blockSize: Number.MAX_SAFE_INTEGER,
      padding: 0,
      selectedColumns: [],
      headingDrawn: false,
    }, tree.metadata || {});

    return tree;
  });

  const alignLabels = Tree.prototype.__lookupGetter__('alignLabels');
  Tree.prototype.__defineGetter__('alignLabels', function () {
    if (this.metadata.show) {
      return this.labelAlign && this.labelAlignEnabled;
    }
    return alignLabels.call(this);
  });

  decorate(Tree, 'draw', function (delegate, args) {
    delegate.apply(this, args);
    this.metadata.headingDrawn = false;
    this.metadata.maxBlockSize = null;
  });

  decorate(Tree, 'getBounds', function (delegate, args) {
    const bounds = delegate.apply(this, args);
    const minx = bounds[0][0];
    const miny = bounds[0][1];
    const maxx = bounds[1][0];
    const maxy = bounds[1][1];
    const metadataHeadingLength = this.getMetadataHeadingLength();
    const { treeType } = this;
    const labelsOnY = treeType === 'rectangular' || treeType === 'diagonal';
    const labelsOnX = treeType === 'hierarchical';
    return [
      [ minx - (labelsOnX ? metadataHeadingLength : 0),
        miny - (labelsOnY ? metadataHeadingLength : 0) ],
      [ maxx, maxy ]
    ];
  });

  decorate(Branch, 'drawLeaf', function (delegate) {
    delegate.call(this);
    if (this.tree.metadata.show) {
      this.drawMetadata();
    }
  });

  decorate(Branch, 'getTotalSize', function (delegate) {
    let totalSize = delegate.call(this);

    if (this.tree.metadata.show) {
      totalSize += this.tree.getMetadataLength();
    }

    return totalSize;
  });

  decorate(Branch, 'getTotalLength', function (delegate) {
    let totalSize = delegate.call(this);

    if (this.tree.metadata.show) {
      totalSize += this.tree.getMetadataLength();
    }
    return totalSize;
  });
}
