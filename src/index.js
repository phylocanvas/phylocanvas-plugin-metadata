import PhyloCanvas, { Tree, Branch } from 'phylocanvas';

function isCircularTree(tree) {
  return tree.treeType === 'circular' || tree.treeType === 'radial';
}
function isRectangularTree(tree) {
  return tree.treeType === 'diagonal' ||
         tree.treeType === 'rectangular' || tree.treeType === 'hierarchical';
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
  var padMaxLabelWidth = 0;
  if (this.showLabels || (this.hoverLabel && this.highlighted)) {
    padMaxLabelWidth = this.maxLabelLength[this.treeType];
  }
  return padMaxLabelWidth +
         this.getMetadataColumnHeadings().length * this.metadata.step;
};

Tree.prototype.getMetadataHeadingLength = function () {
  let maxSize = 0;
  if (this.hasMetadataHeadings()) {
    this.canvas.font = `${this.textSize}px Sans-serif`;
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

  const height = isCircularTree(this.tree) ? this.tree.baseNodeSize :
                 this.tree.step;
  const width = this.tree.metadata.step - this.tree.metadata.padding;

  if (this.tree.alignLabels) {
    if (this.tree.treeType === 'rectangular') {
      tx += (this.tree.farthestNodeFromRootX - this.centerx);
    } else if (this.tree.treeType === 'hierarchical') {
      tx += (this.tree.farthestNodeFromRootY - this.centery);
    }
  }

  if (!this.tree.metadata.headingDrawn && this.tree.hasMetadataHeadings()) {
    this.drawMetadataHeading(tx, ty + height / 2);
    this.tree.metadata.headingDrawn = true;
  }

  if (Object.keys(this.data).length > 0) {
    this.canvas.beginPath();

    // If no columns specified, then draw all columns
    const metadata = (this.tree.metadata.selectedColumns.length > 0) ?
                     this.tree.metadata.selectedColumns :
                     Object.keys(this.data);

    tx += this.tree.metadata.padding * 2;
    ty = ty - (height / 2);

    for (const columnName of metadata) {
      if (typeof this.data[columnName] !== undefined) {
        this.canvas.fillStyle = this.data[columnName];
        this.canvas.fillRect(tx, ty, width, height);
      }
      tx += this.tree.metadata.step;
    }
    this.canvas.stroke();
    this.canvas.closePath();
  }
};

Branch.prototype.drawMetadataHeading = function (x, y) {
  const metadata = (this.tree.metadata.selectedColumns.length > 0) ?
                   this.tree.metadata.selectedColumns :
                   Object.keys(this.data);
  let tx = x;
  const ty = y;
  // Drawing Column headings
  this.canvas.font = `${this.tree.textSize}px Sans-serif`;
  this.canvas.fillStyle = 'black';
  tx += this.tree.metadata.padding * 2;
  tx += (this.tree.metadata.step - this.tree.metadata.padding) / 2;
  for (const columnName of metadata) {
    // Rotate canvas to write column headings
    this.canvas.rotate(-Math.PI / 2);
    if (this.tree.treeType === 'rectangular') {
      this.canvas.textAlign = 'left';
      // x and y axes changed because of rotate
      // Adding + 6 to adjust the position
      this.canvas.fillText(columnName, ty + 20, tx + 6);
    } else if (this.tree.treeType === 'hierarchical') {
      this.canvas.textAlign = 'right';
      this.canvas.fillText(columnName, - ty - 20, tx + 8);
    } else if (this.tree.treeType === 'diagonal') {
      this.canvas.textAlign = 'left';
      this.canvas.fillText(columnName, ty + 20, tx + 6);
    }
    tx += this.tree.metadata.step;
    // Rotate canvas back to normal position
    this.canvas.rotate(Math.PI / 2);
  }
};

export default function metadataPlugin(decorate) {
  decorate(PhyloCanvas, 'createTree', function (delegate, args) {
    const tree = delegate(...args);

    tree.metadata = Object.assign({}, {
      show: false,
      step: 20,
      padding: 2,
      selectedColumns: [],
      headingDrawn: false,
    }, tree.metadata);

    return tree;
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
