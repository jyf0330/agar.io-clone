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
      mapId: 'fixed-arena',
      taskId: 'find-echo-hand'
    });

    expect(result.part.type).to.equal('HAND');
    expect(result.part.templateId).to.equal('hand-thread');
    expect(result.part.source).to.equal('npc-task');
    expect(result.loot.x).to.equal(300);
    expect(map.partLoot.data[0].part.templateId).to.equal('hand-thread');
    expect(events).to.have.length(2);
    expect(events[0]).to.include({
      playerId: 'player-1',
      npcId: 'mochi',
      sessionId: 'session-now',
      mapId: 'fixed-arena',
      x: 300,
      y: 320,
      kind: 'npc_task_completed',
      eventType: 'npc_task_completed'
    });
    expect(events[0].eventId).to.contain(':npc_task_completed:');
    expect(events[0].payload.rewardedPartType).to.equal('HAND');
    expect(events[0].payload.part.templateId).to.equal('hand-thread');
    expect(events[1]).to.include({
      kind: 'rewarded_part',
      eventType: 'rewarded_part',
      playerId: 'player-1',
      npcId: 'mochi'
    });
    expect(events[1].eventId).to.contain(':rewarded_part:');
  });

  it('should not treat pet part questions as npc task reward requests', () => {
    expect(rewards.isTaskRewardRequest('任务')).to.equal(true);
    expect(rewards.isTaskRewardRequest('奖励')).to.equal(true);
    expect(rewards.isTaskRewardRequest('找手')).to.equal(true);
    expect(rewards.isTaskRewardRequest('附近有什么部位？')).to.equal(false);
    expect(rewards.isTaskRewardRequest('这件部位要不要换？')).to.equal(false);
  });
});
