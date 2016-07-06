/* eslint no-param-reassign: ["error", { "props": false }] */

import PhyloCanvas, { Tree, Branch, utils } from 'phylocanvas';

const { constants } = utils;
const { Angles } = constants;

const DEFAULTS = {
  _headingDrawn: false,
  _maxLabelWidth: {},
  _labelWidthTotal: 0,
  show: false,
  showHeaders: true,
  showLabels: true,
  blockLength: 20,
  blockSize: Number.MAX_SAFE_INTEGER,
  padding: 0,
  columns: [],
  propertyName: 'data',
  underlineHeaders: false,
  rotateHeaders: false,
  headersRotationAngle: 0,
  fillStyle: 'black',
  strokeStyle: 'black',
  lineWidth: 1,
  font: null,
};

function isCircularTree(tree) {
  return tree.treeType === 'circular' || tree.treeType === 'radial';
}

function getFontString(tree) {
  if (tree.metadata.font) {
    return tree.metadata.font;
  }
  return `${Math.min(tree.textSize, tree.metadata.blockLength)}pt ${tree.font}`;
}

function getMetadataColumnNames(tree) {
  const { columns, propertyName } = tree.metadata;
  // If no columns specified, then draw all columns
  return columns.length > 0 ?
    columns :
    Object.keys(tree.leaves[0][propertyName]);
}

function hasMetadataHeadings(tree) {
  if (!tree.metadata.showHeaders) {
    return false;
  }
  const { treeType, alignLabels } = tree;
  return treeType === 'diagonal' ||
    (alignLabels && treeType === 'rectangular' || treeType === 'hierarchical');
}

function getMetadataLength(tree) {
  const { blockLength, padding, _labelWidthTotal } = tree.metadata;
  return tree.baseNodeSize * 2 +
         padding +
         _labelWidthTotal +
         getMetadataColumnNames(tree).length * (blockLength + padding);
}

function getMetadataHeadingLength(tree) {
  let maxSize = 0;
  if (hasMetadataHeadings(tree)) {
    const columns = getMetadataColumnNames(tree);
    tree.canvas.font = getFontString(tree);
    for (const colName of columns) {
      maxSize = Math.max(maxSize, tree.canvas.measureText(colName).width + 20);
    }
  }
  return maxSize;
}

function getMetadataMaxBlockSize(tree) {
  if (tree.metadata.maxBlockSize) {
    return tree.metadata.maxBlockSize;
  }

  // the max block size of circular trees is the max angle in pixels
  if (isCircularTree(tree)) {
    let maxHypot = 0;
    for (const lf of tree.leaves) {
      let tx = lf.getLabelStartX();
      if (tree.showLabels || (tree.hoverLabel && lf.highlighted)) {
        tx += tree.maxLabelLength[tree.treeType];
      }
      const offset = tree.alignLabels ? tree.labelAlign.getLabelOffset(lf) : 0;
      const hypot = Math.hypot(lf.centerx - lf.startx, lf.centery - lf.starty) +
                    tx + offset;
      if (hypot > maxHypot) maxHypot = hypot;
    }
    tree.metadata.maxBlockSize = Angles.FULL * maxHypot / tree.leaves.length;
    return tree.metadata.maxBlockSize;
  }

  // the max block size for non-circular trees is equal to the tree step
  return tree.step;
}

function drawMetadataHeading(branch, x, y) {
  const ctx = branch.tree.canvas;
  const { treeType } = branch.tree;
  const { _maxLabelWidth, blockLength, padding, fillStyle,
          strokeStyle, underlineHeaders, rotateHeaders } = branch.tree.metadata;
  const metadata = (branch.tree.metadata.columns.length > 0) ?
                   branch.tree.metadata.columns :
                   Object.keys(branch.data);
  const lineWidth = branch.tree.metadata.lineWidth / branch.tree.zoom;
  // Drawing Column headings
  ctx.font = getFontString(branch.tree);
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
      branch.canvas.rotate(-Math.PI / 2);
      branch.canvas.fillText(columnName, ty, tx + headerLength / 2);
      branch.canvas.rotate(Math.PI / 2);
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = (treeType === 'hierarchical') ? 'top' : 'bottom';
      branch.canvas.fillText(columnName, tx + headerLength / 2, -ty);
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
}

function drawMetadata(branch) {
  const ctx = branch.tree.canvas;
  const tree = branch.tree;
  const { _maxLabelWidth, blockSize, blockLength, padding, propertyName,
          fillStyle, columns, showLabels } = branch.tree.metadata;

  // set initial x and y coordinates
  let tx = branch.getLabelStartX();
  let ty = 0;

  if (tree.showLabels || (tree.hoverLabel && branch.highlighted)) {
    tx += tree.maxLabelLength[tree.treeType];
  }

  // makes sure that the block size is not greater than tree step or max angle
  const maxSize = getMetadataMaxBlockSize(tree);
  const size = Math.min(maxSize, blockSize);

  // add padding to both x and y axis
  if (tree.alignLabels) {
    tx += tree.labelAlign.getLabelOffset(this);
  }
  tx += padding;
  ty = ty - (size / 2);

  // draw column headers
  if (!tree.metadata._headingDrawn && hasMetadataHeadings(tree)) {
    drawMetadataHeading(branch, tx, size);
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
    const font = getFontString(tree);
    for (const columnName of columnNames) {
      if (typeof data[columnName] !== 'undefined') {
        ctx.fillStyle = data[columnName].colour || data[columnName];
        ctx.fillRect(tx, ty, blockLength, size + i * stepCorrection);
        if (showLabels && typeof data[columnName].label === 'string') {
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
}

function setMaxLabelWidths(tree) {
  const ctx = tree.canvas;
  const { showLabels, propertyName, columns, rotateHeaders } = tree.metadata;

  // If no columns specified, then draw all columns
  const columnNames =
    columns.length > 0 ? columns : Object.keys(tree.leaves[0][propertyName]);

  ctx.font = getFontString(tree);

  const maxLabelWidth = {};
  if (showLabels) {
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
  } else {
    for (const col of columnNames) {
      maxLabelWidth[col] = 0;
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

    tree.metadata = Object.assign({}, DEFAULTS, tree.metadata || {});

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
    if (this.metadata.show) {
      this.metadata._headingDrawn = false;
      this.metadata.maxBlockSize = null;
      setMaxLabelWidths(this);
    }
  });

  decorate(Tree, 'getBounds', function (delegate, args) {
    const bounds = delegate.apply(this, args);
    if (this.metadata.show) {
      const minx = bounds[0][0];
      const miny = bounds[0][1];
      const maxx = bounds[1][0];
      const maxy = bounds[1][1];
      const metadataHeadingLength = getMetadataHeadingLength(this);
      const { treeType } = this;
      const labelsOnY = treeType === 'rectangular' || treeType === 'diagonal';
      const labelsOnX = treeType === 'hierarchical';
      return [
        [ minx - (labelsOnX ? metadataHeadingLength : 0),
          miny - (labelsOnY ? metadataHeadingLength : 0) ],
        [ maxx, maxy ],
      ];
    }
    return bounds;
  });

  decorate(Branch, 'drawLeaf', function (delegate) {
    delegate.call(this);
    if (this.tree.metadata.show) {
      drawMetadata.call(this, this);
    }
  });

  decorate(Branch, 'getTotalSize', function (delegate) {
    let totalSize = delegate.call(this);

    if (this.tree.metadata.show) {
      totalSize += getMetadataLength(this.tree);
    }

    return totalSize;
  });

  decorate(Branch, 'getTotalLength', function (delegate) {
    let totalSize = delegate.call(this);

    if (this.tree.metadata.show) {
      totalSize += getMetadataLength(this.tree);
    }
    return totalSize;
  });
}
