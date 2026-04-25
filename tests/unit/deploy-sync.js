/*jshint expr:true */

'use strict';

const expect = require('chai').expect;
const deploySync = require('../../tools/deploy/rsync-plan');

describe('deploy rsync plan', () => {
  it('should exclude repository, dependency, secret, generated graph, and runtime state paths', () => {
    expect(deploySync.DEFAULT_EXCLUDES).to.include.members([
      '.git/',
      'node_modules/',
      'data/',
      '.env',
      '.env.local',
      '.launcher/',
      '.playwright-cli/',
      'graphify-out/',
      '.DS_Store'
    ]);
  });

  it('should build a dry-run command that cannot delete or copy local state by accident', () => {
    const command = deploySync.buildRsyncCommand({
      keyPath: '/tmp/agar.pem',
      source: './',
      target: 'ubuntu@124.222.83.113:/home/ubuntu/apps/agar-io-clone/',
      dryRun: true
    });

    expect(command).to.contain('--dry-run');
    expect(command).to.contain('--delete');
    expect(command).to.contain("--exclude 'data/'");
    expect(command).to.contain("--exclude '.env.local'");
    expect(command).to.contain('ubuntu@124.222.83.113:/home/ubuntu/apps/agar-io-clone/');
  });
});
