const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;

describe('static startup entrypoints', () => {
  it('should keep the browser shell and server entrypoints discoverable', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const clientHtml = fs.readFileSync(path.join(projectRoot, 'apps/client/index.html'), 'utf8');

    expect(fs.existsSync(path.join(projectRoot, 'apps/server/src/server.js'))).to.equal(true);
    expect(fs.existsSync(path.join(projectRoot, 'apps/client/src/app.js'))).to.equal(true);
    expect(clientHtml).to.include('开放吞噬');
    expect(clientHtml).to.include('js/app.js');
  });
});
