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
  for (const leave of this.leaves) {
    const keys = Object.keys(leave.data);
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

Tree.prototype.getMetadataLength = function (delegate) {
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

Tree.prototype.clearMetadata = function () {
  for (var i = 0; i < this.leaves.length; i++) {
    if (Object.keys(this.leaves[i].data).length > 0) {
      this.leaves[i].data = {};
    }
  }
};

Branch.prototype.drawMetadata = function () {
  let padMaxLabelWidth = 0;
  if (this.tree.showLabels || (this.tree.hoverLabel && this.highlighted)) {
    padMaxLabelWidth = this.tree.maxLabelLength[this.tree.treeType];
  }
  let tx = this.getLabelStartX() + padMaxLabelWidth;
  let ty = 0;
  const labelOffset = this.tree.alignLabels ? this.tree.labelAlign.getLabelOffset(this) : 0;
  const maxHeight =
    isCircularTree(this.tree) ?
      Angles.FULL * (Math.hypot(this.centerx - this.startx, this.centery - this.starty) + tx + labelOffset) / this.tree.leaves.length :
      this.tree.step;
  const height = Math.min(maxHeight, this.tree.metadata.blockSize);
  const width = this.tree.metadata.blockLength - this.tree.metadata.padding;

  // add padding to both x and y axis
  if (this.tree.alignLabels) {
    tx += labelOffset;
  }
  tx += this.tree.metadata.padding * 2;
  ty = ty - (height / 2);
  if (!this.tree.metadata.headingDrawn && this.tree.hasMetadataHeadings()) {
    this.drawMetadataHeading(tx, height * 1.5);
    this.tree.metadata.headingDrawn = true;
  }

  if (Object.keys(this.data).length > 0) {
    this.canvas.beginPath();

    // If no columns specified, then draw all columns
    const metadata = (this.tree.metadata.selectedColumns.length > 0) ?
                     this.tree.metadata.selectedColumns :
                     Object.keys(this.data);

    for (const columnName of metadata) {
      if (typeof this.data[columnName] !== undefined) {
        this.canvas.fillStyle = this.data[columnName];
        this.canvas.fillRect(tx, ty, width, height);
      }
      tx += this.tree.metadata.blockLength;
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
      blockSize: 200,
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
