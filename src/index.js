/* eslint no-param-reassign: ["error", { "props": false }] */

import PhyloCanvas, { Tree, Branch, utils } from 'phylocanvas';

const { constants } = utils;
const { Angles } = constants;

function isCircularTree(tree) {
  return tree.treeType === 'circular' || tree.treeType === 'radial';
}

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
  if (!this.metadata.headers) {
    return false;
  }
  const { treeType, alignLabels } = this;
  return treeType === 'diagonal' ||
    (alignLabels && treeType === 'rectangular' || treeType === 'hierarchical');
};

Tree.prototype.getMetadataLength = function () {
  const { blockLength, padding, _labelWidthTotal } = this.metadata;
  return this.baseNodeSize * 2 +
         padding +
         _labelWidthTotal +
         this.getMetadataColumnHeadings().length * (blockLength + padding);
};

Tree.prototype.getMetadataHeadingLength = function () {
  let maxSize = 0;
  if (this.hasMetadataHeadings()) {
    const fontSize = Math.min(this.textSize, this.metadata.blockLength);
    this.canvas.font = `${fontSize}px Sans-serif`;
    for (const colName of this.metadata.columns) {
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
  const ctx = this.tree.canvas;
  const tree = this.tree;
  const { blockSize, blockLength, padding, propertyName, fillStyle, font,
          columns, _maxLabelWidth } = this.tree.metadata;

  // set initial x and y coordinates
  let tx = this.getLabelStartX();
  let ty = 0;

  if (tree.showLabels || (tree.hoverLabel && this.highlighted)) {
    tx += tree.maxLabelLength[tree.treeType];
  }

  // makes sure that the block size is not greater than tree step or max angle
  const maxSize = tree.getMetadataMaxBlockSize();
  const size = Math.min(maxSize, blockSize);

  // add padding to both x and y axis
  if (tree.alignLabels) {
    tx += tree.labelAlign.getLabelOffset(this);
  }
  tx += padding;
  ty = ty - (size / 2);

  // draw column headers
  if (!tree.metadata._headingDrawn && tree.hasMetadataHeadings()) {
    this.drawMetadataHeading(tx, size);
    tree.metadata._headingDrawn = true;
  }

  const data = this[propertyName];
  if (Object.keys(data).length > 0) {
    ctx.beginPath();

    // If no columns specified, then draw all columns
    const columnNames = columns.length > 0 ? columns : Object.keys(data);

    let i = 1;
    const stepCorrection =
      isCircularTree(tree) && tree.alignLabels ?
        Angles.FULL * blockLength / tree.leaves.length :
        0;
    for (const columnName of columnNames) {
      if (typeof data[columnName] !== 'undefined') {
        ctx.fillStyle = data[columnName].colour || data[columnName];
        ctx.fillRect(tx, ty, blockLength, size + i * stepCorrection);
        if (typeof data[columnName].label === 'string') {
          ctx.font = font;
          ctx.fillStyle = fillStyle;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(data[columnName].label,
            tx + blockLength + padding / 4, ty + size / 2);
        }
      }
      tx += blockLength + padding + _maxLabelWidth[columnName];
      i++;
    }
    ctx.stroke();
    ctx.closePath();
  }
};

Branch.prototype.drawMetadataHeading = function (x, y) {
  const ctx = this.tree.canvas;
  const { treeType } = this.tree;
  const { _maxLabelWidth, blockLength, padding, lineWidth, fillStyle,
          strokeStyle, underlineHeaders, rotateHeaders } = this.tree.metadata;
  const metadata = (this.tree.metadata.columns.length > 0) ?
                   this.tree.metadata.columns :
                   Object.keys(this.data);

  // Drawing Column headings
  ctx.font = this.tree.metadata.font;
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;

  let tx = x;
  const ty = treeType === 'hierarchical' ? -y : y;
  for (const columnName of metadata) {
    const headerLength = blockLength + _maxLabelWidth[columnName];
    if (rotateHeaders) {
      ctx.textAlign = (treeType === 'hierarchical') ? 'right' : 'left';
      ctx.textBaseline = 'middle';
      this.canvas.rotate(-Math.PI / 2);
      this.canvas.fillText(columnName, ty, tx + headerLength / 2);
      this.canvas.rotate(Math.PI / 2);
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = (treeType === 'hierarchical') ? 'top' : 'bottom';
      this.canvas.fillText(columnName, tx + headerLength / 2, -ty);
    }
    if (underlineHeaders) {
      const ly = (treeType === 'hierarchical') ? y - lineWidth : -y + lineWidth;
      ctx.beginPath();
      ctx.moveTo(tx, ly);
      ctx.lineTo(tx + headerLength, ly);
      ctx.stroke();
      ctx.closePath();
    }
    tx += headerLength + padding;
  }
};

function setMaxLabelWidths(tree) {
  const ctx = tree.canvas;
  const { propertyName, font, columns, rotateHeaders } = tree.metadata;

  // If no columns specified, then draw all columns
  const columnNames =
    columns.length > 0 ? columns : Object.keys(tree.leaves[0][propertyName]);

  ctx.font = font;

  const maxLabelWidth = {};
  for (const col of columnNames) {
    maxLabelWidth[col] = rotateHeaders ? 0 : ctx.measureText(col).width;
  }

  for (const leaf of tree.leaves) {
    const data = leaf[propertyName];
    for (const columnName of columnNames) {
      if (data[columnName] && typeof data[columnName].label === 'string') {
        const textWidth = ctx.measureText(data[columnName].label).width;
        if (textWidth > maxLabelWidth[columnName]) {
          maxLabelWidth[columnName] = textWidth;
        }
      }
    }
  }

  tree.metadata._maxLabelWidth = maxLabelWidth;

  tree.metadata._labelWidthTotal = 0;
  for (const columnName of columnNames) {
    tree.metadata._labelWidthTotal += maxLabelWidth[columnName];
  }
}

export default function metadataPlugin(decorate) {
  decorate(PhyloCanvas, 'createTree', (delegate, args) => {
    const tree = delegate(...args);

    tree.metadata = Object.assign({}, {
      _headingDrawn: false,
      _maxLabelWidth: {},
      _labelWidthTotal: 0,
      show: false,
      blockLength: 20,
      blockSize: Number.MAX_SAFE_INTEGER,
      padding: 0,
      columns: [],
      propertyName: 'data',
      headers: true,
      underlineHeaders: false,
      rotateHeaders: false,
      fillStyle: 'black',
      strokeStyle: 'black',
      lineWidth: 2,
      font: '16px Sans-serif',
      textBaseline: 'bottom',
      textAlign: 'center',
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
    this.metadata._headingDrawn = false;
    this.metadata.maxBlockSize = null;
    setMaxLabelWidths(this);
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
      [ maxx, maxy ],
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
