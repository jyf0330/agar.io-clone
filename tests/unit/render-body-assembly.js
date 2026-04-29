/*jshint expr:true */

const expect = require('chai').expect;
const render = require('../../apps/client/src/render');

describe('render body assembly', () => {
  it('should draw body assembly layers by anchor z-index', () => {
    const drawn = [];
    const graph = {
      save() {},
      restore() {},
      beginPath() {},
      closePath() {},
      arc() {},
      fill() {},
      stroke() {},
      drawImage(image, x, y, width, height) {
        drawn.push({ id: image.id, x, y, width, height });
      }
    };
    const bodyAssembly = {
      layers: {
        base: {imageObject: {id: 'base'}},
        head: {imageObject: {id: 'head'}},
        body: {imageObject: {id: 'body'}},
        hand_left: {imageObject: {id: 'hand_left'}},
        hand_right: {imageObject: {id: 'hand_right'}},
        leg_left: {imageObject: {id: 'leg_left'}},
        leg_right: {imageObject: {id: 'leg_right'}}
      },
      anchors: {
        head: { x: 512, y: 210, zIndex: 30 },
        body: { x: 512, y: 430, zIndex: 10 },
        hand_left: { x: 330, y: 430, zIndex: 20 },
        hand_right: { x: 690, y: 430, zIndex: 20 },
        leg_left: { x: 430, y: 670, zIndex: 5 },
        leg_right: { x: 590, y: 670, zIndex: 5 }
      }
    };

    render.drawBodyAssemblyCell({
      x: 100,
      y: 100,
      radius: 50,
      bodyAssembly: bodyAssembly
    }, graph);

    expect(drawn.map((entry) => entry.id)).to.deep.equal([
      'base',
      'leg_left',
      'leg_right',
      'body',
      'hand_left',
      'hand_right',
      'head'
    ]);
  });
});
