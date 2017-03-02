/* eslint no-param-reassign: ["error", { "props": false }] */

import PhyloCanvas, { Tree, Branch, Prerenderer, utils } from 'phylocanvas';

const { constants } = utils;
const { Angles } = constants;

const DEFAULTS = {
  _headingDrawn: false,
  _maxLabelWidth: {},
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
  const { showLabels, blockLength, padding, _maxLabelWidth } = tree.metadata;
  const cols = getMetadataColumnNames(tree);
  return (showLabels ? cols.reduce((pre, cur) => _maxLabelWidth[cur], 0) : 0) +
         cols.length * (blockLength + padding);
}

function getMetadataMaxBlockSize(tree) {
  if (tree.metadata._maxBlockSize) {
    return tree.metadata._maxBlockSize;
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
    tree.metadata._maxBlockSize = Angles.FULL * maxHypot / tree.leaves.length;
    return tree.metadata._maxBlockSize;
  }

  // the max block size for non-circular trees is equal to the tree step
  return tree.step;
}

function drawMetadataHeading(branch, startX, startY) {
  const ctx = branch.tree.canvas;
  const { treeType } = branch.tree;
  const { _maxLabelWidth, _maxHeaderWidth, _maxHeaderHeight,
          blockLength, padding, headerAngle, showLabels,
          fillStyle, strokeStyle, underlineHeaders } = branch.tree.metadata;
  const metadata = (branch.tree.metadata.columns.length > 0) ?
                   branch.tree.metadata.columns :
                   Object.keys(branch.data);
  const lineWidth = branch.tree.metadata.lineWidth / branch.tree.zoom;
  // Drawing Column headings
  ctx.font = getFontString(branch.tree);
  ctx.fillStyle = fillStyle;
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;

  const angle = (headerAngle / 180) * Math.PI;
  const y =
    startY + _maxHeaderHeight / 2 + Math.sin(angle) * _maxHeaderWidth / 2;
  const sign = treeType === 'hierarchical' ? -1 : 1;
  let x = startX;
  for (const columnName of metadata) {
    const headerLength =
      blockLength + (showLabels ? _maxLabelWidth[columnName] : 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelX = x + headerLength / 2;
    ctx.rotate(-angle);
    ctx.fillText(columnName,
      Math.cos(angle) * labelX + Math.sin(angle) * sign * y,
      Math.sin(angle) * labelX + Math.cos(angle) * -sign * y);
    ctx.rotate(angle);
    if (underlineHeaders) {
      ctx.beginPath();
      ctx.moveTo(x, -sign * startY);
      ctx.lineTo(x + headerLength, -sign * startY);
      ctx.stroke();
      ctx.closePath();
    }
    x += headerLength + padding;
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
  const size = blockSize !== null ? Math.min(maxSize, blockSize) : maxSize;

  // add padding to both x and y axis
  if (tree.alignLabels) {
    tx += tree.labelAlign.getLabelOffset(branch);
  }
  tx += padding;
  ty = ty - (size / 2);

  // draw column headers
  if (!tree.metadata._headingDrawn && hasMetadataHeadings(tree)) {
    drawMetadataHeading(branch, tx, size / 2 + padding);
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
      if (typeof data[columnName] !== 'undefined' && branch.leafStyle.fillStyle !== 'transparent') {
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
      tx += blockLength + padding;
      if (showLabels) {
        tx += _maxLabelWidth[columnName];
      }
      i++;
    }
    ctx.closePath();
  }
}

function setMaxLabelWidths(tree) {
  const ctx = tree.canvas;
  const { showLabels, propertyName, headerAngle } = tree.metadata;
  const columnNames = getMetadataColumnNames(tree);
  const angle = (headerAngle / 180) * Math.PI;

  ctx.font = getFontString(tree);

  tree.metadata._maxHeaderWidth = 0;
  tree.metadata._maxHeaderHeight = ctx.measureText('M').width;
  const maxLabelWidth = {};
  if (showLabels) {
    for (const col of columnNames) {
      const labelWidth = ctx.measureText(col).width;
      maxLabelWidth[col] = Math.cos(angle) * labelWidth;
      if (labelWidth > tree.metadata._maxHeaderWidth) {
        tree.metadata._maxHeaderWidth = labelWidth;
      }
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
}

export default function metadataPlugin(decorate) {
  decorate(PhyloCanvas, 'createTree', (delegate, args) => {
    const tree = delegate(...args);

    tree.metadata = Object.assign({}, DEFAULTS, tree.metadata || {});

    return tree;
  });

  const alignLabels = Tree.prototype.__lookupGetter__('alignLabels');
  Tree.prototype.__defineGetter__('alignLabels', function () {
    if (this.metadata.active) {
      return this.labelAlign && this.labelAlignEnabled;
    }
    return alignLabels.call(this);
  });

  decorate(Prerenderer, 'run', function (delegate, args) {
    delegate.apply(this, args);
    const [ tree ] = args;
    setMaxLabelWidths(tree);
    tree.metadata._maxBlockSize = null;
  });

  decorate(Tree, 'draw', function (delegate, args) {
    if (this.metadata.active) {
      this.metadata._headingDrawn = false;
    }
    delegate.apply(this, args);
  });

  decorate(Tree, 'getBounds', function (delegate, args) {
    const bounds = delegate.apply(this, args);
    if (this.metadata.active) {
      const minx = bounds[0][0];
      const miny = bounds[0][1];
      const maxx = bounds[1][0];
      const maxy = bounds[1][1];
      const { _maxHeaderWidth, _maxHeaderHeight } = this.metadata;
      const { treeType } = this;
      const labelsOnY = treeType === 'rectangular' || treeType === 'diagonal';
      const labelsOnX = treeType === 'hierarchical';
      return [
        [ minx - (labelsOnX ? _maxHeaderWidth + _maxHeaderHeight : 0),
          miny - (labelsOnY ? _maxHeaderWidth + _maxHeaderHeight : 0) ],
        [ maxx, maxy ],
      ];
    }
    return bounds;
  });

  decorate(Branch, 'drawLeaf', function (delegate) {
    delegate.call(this);
    if (this.tree.metadata.active) {
      drawMetadata.call(this, this);
    }
  });

  decorate(Branch, 'getTotalLength', function (delegate) {
    let totalSize = delegate.call(this);

    if (this.tree.metadata.active) {
      totalSize += getMetadataLength(this.tree);
    }
    return totalSize;
  });
}
