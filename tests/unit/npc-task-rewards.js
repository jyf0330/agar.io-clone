/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const rewards = require('../../apps/server/src/npc/task-rewards');
const mapUtils = require('../../apps/server/src/map/map');
const playerUtils = require('../../apps/server/src/map/player');

describe('npc task rewards', () => {
  it('should create a complete body part reward and record the fact', () => {
    const events = [];
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 300, y: 320 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'quester',
      screenWidth: 800,
      screenHeight: 600
    });

    const result = rewards.grantNpcTaskReward({
      map,
      player,
      npc: { id: 'mochi', player: { name: 'Mochi', x: 280, y: 310 } },
      memoryStore: {
        recordEvent(event) {
          events.push(event);
        }
      },
      sessionId: 'session-now',
      taskId: 'find-echo-hand'
    });

    expect(result.part.type).to.equal('HAND');
    expect(result.part.templateId).to.equal('hand-thread');
    expect(result.part.source).to.equal('npc-task');
    expect(result.loot.x).to.equal(300);
    expect(map.partLoot.data[0].part.templateId).to.equal('hand-thread');
    expect(events[0].kind).to.equal('npc_task_reward');
    expect(events[0].payload.part.templateId).to.equal('hand-thread');
  });
});
