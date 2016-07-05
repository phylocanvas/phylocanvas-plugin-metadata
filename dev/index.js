import PhyloCanvas, * as phyloComponents from 'phylocanvas';
import metadataPlugin from '../src/index';

PhyloCanvas.plugin(metadataPlugin);

function getRandomColour() {
  return `#${Math.random().toString(16).slice(-6)}`;
}

function getRandomLabel() {
  const length = 1 + Math.random() * 16;
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const numberOfColumns = 4;

const tree = PhyloCanvas.createTree('phylocanvas', {
  padding: 1,
  metadata: {
    show: true,
    blockLength: 32,
    blockSize: 32,
    padding: 16,
    // headers: false,
    underlineHeaders: 'true',
    // rotateHeaders: true,
  },
});

// create buttons
const buttonForm = document.getElementById('buttons');
for (const treeType of Object.keys(phyloComponents.treeTypes)) {
  const button = document.createElement('button');
  button.innerHTML = treeType;
  button.addEventListener('click', tree.setTreeType.bind(tree, treeType));
  buttonForm.appendChild(button);
}

const scaleRange = document.createElement('input');
scaleRange.type = 'range';
scaleRange.min = 1;
scaleRange.max = 100;
scaleRange.step = 1;
scaleRange.addEventListener('change', () => {
  const value = Number(scaleRange.value);
  tree.metadata.blockLength = value;
  tree.setNodeSize(value);
});
buttonForm.appendChild(scaleRange);

tree.on('error', function (event) { throw event.error; });

tree.on('loaded', function () {
  console.log('loaded');
  for (let i = 0; i <= tree.leaves.length; i++) {
    if (tree.leaves[i]) {
      tree.leaves[i].data = {};
      for (let j = 0; j < numberOfColumns; j++) {
        // tree.leaves[i].data[`col_${j}`] = getRandomColour();
        tree.leaves[i].data[`col_${j}`] = {
          label: getRandomLabel(),
          colour: getRandomColour(),
        };
      }
    }
  }
  // tree.viewMetadataColumns();

  // tree.labelAlignEnabled = true;
  // tree.showLabels = false;

  // const bounds = tree.getBounds();
  // const treeSize = [
  //   bounds[1][0] - bounds[0][0],
  //   bounds[1][1] - bounds[0][1],
  // ];
  // tree.metadata.step = Math.min(160, treeSize[0] / tree.getMetadataColumnHeadings().length);
  // tree.metadata.padding = tree.metadata.step / 10;
  // tree.setTextSize(50);
  // tree.setNodeSize(50);

  // tree.zoom = 10; tree.offsetx = -9500; tree.offsety = 200;

  // tree.zoom = 6; tree.offsetx = -2000; tree.offsety = -2000;

  tree.draw();
  tree.fitInPanel();
  tree.draw();
});

tree.setTreeType('diagonal');
tree.setTreeType('rectangular');
// tree.setTreeType('hierarchical');
// tree.setTreeType('circular');
tree.alignLabels = true;
// tree.showLabels = false;

const originalDraw = tree.draw;
tree.draw = (...args) => {
  originalDraw.apply(tree, args);
  const bounds = tree.getBounds();
  tree.canvas.strokeRect(bounds[0][0], bounds[0][1], bounds[1][0] - bounds[0][0], bounds[1][1] - bounds[0][1]);
};

tree.load('(A:0.1,B:0.1,(C:0.1,D:0.1):0.1);');
// tree.load('(LwvfR33:3.3,LVJeB53:5.3,VbrFX46:4.6,DIrBt40:4.0,RLInK79:7.9,boeor56:5.6,uykrL87:8.7,juZRm85:8.5,zzzAx8:0.8,rpTsP5:0.5,PfGRl17:1.7,WdCeP58:5.8,tjskX18:1.8,PBjcj90:9.0,fkZCB86:8.6,edIRK84:8.4,TIWyz39:3.9,GoYsx64:6.4,yXHow13:1.3,RDRgZ76:7.6,(zcZrV61:6.1,tUgIj98:9.8,QubGL88:8.8,VKDAd9:0.9,VbKbt66:6.6,potjk63:6.3,mpgnS55:5.5,ePmJG38:3.8,PRRzC27:2.7,frpyI93:9.3,woSdo28:2.8,QIYTH24:2.4,GpeUW1:0.1,izDwR49:4.9,MlrCA10:1.0,UcqjB82:8.2,yBDKy60:6.0,Mawuq68:6.8,aWDcf35:3.5,SyWmn37:3.7)2:2,(XPVjB65:6.5,gvlIA3:0.3,RfZcY11:1.1,ykqjh50:5.0,NCRwt74:7.4,OIDCu73:7.3,hrFXH30:3.0,Ujzrb6:0.6,GsQwa77:7.7,KjhuO75:7.5,rMzWv32:3.2,ILNPk89:8.9,SKtoN36:3.6,ORHEH72:7.2,HPRLH31:3.1,EFDMi51:5.1,bPBYx83:8.3,vBOJu4:0.4,ZYQpu16:1.6,hRwJZ91:9.1)3:3,(WVBjI41:4.1,nWxzb62:6.2,QxPsL99:9.9,srPxC20:2.0,zbsnu25:2.5,bUbRj2:0.2,HgZJu19:1.9,sIuqO22:2.2,agHuX95:9.5,RIHLR34:3.4,jpriT29:2.9,eOeIh96:9.6,gojNG14:1.4,QQkuc45:4.5,bBwet80:8.0,EXTev54:5.4,sdhgA12:1.2,OwkUJ15:1.5,AZuzK59:5.9,kqMVk26:2.6)4:4,(MklgR23:2.3,BYPrG44:4.4,AETQe71:7.1,QEuUI94:9.4,lBQmP57:5.7,lOiXr78:7.8,yqTwn92:9.2,AFYFS43:4.3,EPILs52:5.2,HjLIE42:4.2,XHzBP69:6.9,nVLhr21:2.1,EyXFC48:4.8,zVggg67:6.7,oyxjs47:4.7,TuWTX100:10.0,GkTUn7:0.7,CFozD97:9.7,jfhZs70:7.0,lVVRG81:8.1)5:5)1;');

window.tree = window.phylocanvas = tree;
