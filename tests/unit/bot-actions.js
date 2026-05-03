/*jshint expr:true */

const EventEmitter = require('events');
const expect = require('chai').expect;
const {applyBotActions, planBotActions} = require('../../apps/bot-client/src/bot-actions');

function createFakeSocket() {
  const socket = new EventEmitter();
  socket.emitted = [];
  socket.emit = function (eventName, payload) {
    socket.emitted.push({eventName, payload});
    EventEmitter.prototype.emit.call(socket, eventName, payload);
  };
  return socket;
}

function randomSequence(values) {
  let index = 0;
  return function () {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
}

describe('bot-actions.js', () => {
  it('should plan player-like actions from visible world state', () => {
    const actions = planBotActions({
      player: {
        x: 100,
        y: 200,
        massTotal: 250
      },
      game: {
        width: 5000,
        height: 5000
      },
      visibleFood: [
        {x: 300, y: 220},
        {x: 900, y: 900}
      ],
      profile: {
        strategy: {
          splitMassThreshold: 220,
          ejectMassThreshold: 180
        }
      }
    });

    expect(actions).to.deep.equal([
      {type: 'moveTarget', target: {x: 300, y: 220}},
      {type: 'ejectMass'},
      {type: 'split'}
    ]);
  });

  it('should avoid nearby larger players before chasing resources', () => {
    const actions = planBotActions({
      player: {
        x: 100,
        y: 100,
        massTotal: 80
      },
      game: {
        width: 5000,
        height: 5000
      },
      visiblePlayers: [
        {x: 130, y: 100, massTotal: 220, name: 'Large_Player'}
      ],
      visibleFood: [
        {x: 140, y: 100}
      ],
      profile: {
        strategy: {
          humanize: true,
          dangerRadius: 300,
          caution: 1
        }
      }
    });

    expect(actions).to.deep.equal([
      {type: 'moveTarget', target: {x: 0, y: 100}}
    ]);
  });

  it('should not flee farther into a hard map corner', () => {
    const actions = planBotActions({
      player: {
        x: 4992,
        y: 4992,
        massTotal: 80
      },
      game: {
        width: 5000,
        height: 5000
      },
      visiblePlayers: [
        {x: 4700, y: 4700, massTotal: 220, name: 'Large_Player'}
      ],
      profile: {
        strategy: {
          humanize: true,
          dangerRadius: 600,
          caution: 1
        }
      }
    });

    expect(actions[0].target.x).to.be.at.most(4992);
    expect(actions[0].target.y).to.be.at.most(4992);
    expect(actions[0].target).to.not.deep.equal({x: 5000, y: 5000});
  });

  it('should let aggressive humanized bots pursue obviously smaller nearby players', () => {
    const actions = planBotActions({
      player: {
        x: 500,
        y: 500,
        massTotal: 240
      },
      game: {
        width: 5000,
        height: 5000
      },
      visiblePlayers: [
        {x: 650, y: 540, massTotal: 70, name: 'Small_Player'}
      ],
      visibleFood: [
        {x: 510, y: 510}
      ],
      profile: {
        strategy: {
          humanize: true,
          aggression: 1,
          huntRadius: 600
        }
      },
      random: function () {
        return 0;
      }
    });

    expect(actions).to.deep.equal([
      {type: 'moveTarget', target: {x: 650, y: 540}}
    ]);
  });

  it('should prefer a richer nearby food cluster over one isolated pellet', () => {
    const actions = planBotActions({
      player: {
        x: 1000,
        y: 1000,
        massTotal: 80
      },
      game: {
        width: 5000,
        height: 5000
      },
      visibleFood: [
        {x: 1030, y: 1000, mass: 1},
        {x: 1260, y: 1020, mass: 1},
        {x: 1270, y: 1010, mass: 1},
        {x: 1280, y: 1030, mass: 1},
        {x: 1290, y: 1020, mass: 1}
      ],
      profile: {
        strategy: {
          humanize: true
        }
      },
      random: function () {
        return 0.9;
      }
    });

    expect(actions[0].target).to.deep.equal({x: 1275, y: 1020});
  });

  it('should move toward visible body part loot before fallback wandering', () => {
    const actions = planBotActions({
      player: {
        x: 1000,
        y: 1000,
        massTotal: 80
      },
      game: {
        width: 5000,
        height: 5000
      },
      visiblePlayers: [],
      visibleFood: [],
      visiblePartLoot: [
        {x: 860, y: 940, part: {partType: 'HEART'}}
      ],
      profile: {
        strategy: {
          humanize: true
        }
      },
      memory: {},
      random: randomSequence([0.25, 0.75])
    });

    expect(actions[0].target).to.deep.equal({x: 860, y: 940});
  });

  it('should steer fallback wandering away from map edges', () => {
    const actions = planBotActions({
      player: {
        x: 4991,
        y: 4991,
        massTotal: 80
      },
      game: {
        width: 5000,
        height: 5000
      },
      visiblePlayers: [],
      visibleFood: [],
      profile: {
        strategy: {
          humanize: true
        }
      },
      memory: {},
      random: randomSequence([0.5, 0.5])
    });

    expect(actions[0].target.x).to.be.within(420, 4580);
    expect(actions[0].target.y).to.be.within(420, 4580);
    expect(actions[0].target.x).to.be.below(4991);
    expect(actions[0].target.y).to.be.below(4991);
  });

  it('should ignore edge food when it would keep a humanized bot pinned to the wall', () => {
    const actions = planBotActions({
      player: {
        x: 4991,
        y: 4991,
        massTotal: 80
      },
      game: {
        width: 5000,
        height: 5000
      },
      visiblePlayers: [],
      visibleFood: [
        {x: 4998, y: 4998, mass: 1}
      ],
      profile: {
        strategy: {
          humanize: true
        }
      },
      memory: {},
      random: randomSequence([0.5, 0.5])
    });

    expect(actions[0].target.x).to.be.within(420, 4580);
    expect(actions[0].target.y).to.be.within(420, 4580);
    expect(actions[0].target.x).to.be.below(4991);
    expect(actions[0].target.y).to.be.below(4991);
  });

  it('should keep a live fallback wander target until it is reached', () => {
    const memory = {};
    const random = randomSequence([0.25, 0.75, 0.9, 0.1]);
    const firstActions = planBotActions({
      player: {
        x: 2000,
        y: 2000,
        massTotal: 80
      },
      game: {
        width: 5000,
        height: 5000
      },
      visiblePlayers: [],
      visibleFood: [],
      profile: {
        strategy: {
          humanize: true
        }
      },
      memory,
      random
    });
    const secondActions = planBotActions({
      player: {
        x: 2050,
        y: 2050,
        massTotal: 80
      },
      game: {
        width: 5000,
        height: 5000
      },
      visiblePlayers: [],
      visibleFood: [],
      profile: {
        strategy: {
          humanize: true
        }
      },
      memory,
      random
    });

    expect(secondActions[0].target).to.deep.equal(firstActions[0].target);
  });

  it('should force a fresh wander target when a humanized bot is stuck', () => {
    const actions = planBotActions({
      player: {
        x: 1000,
        y: 1000,
        massTotal: 80
      },
      game: {
        width: 5000,
        height: 5000
      },
      visiblePlayers: [],
      visibleFood: [
        {x: 1020, y: 1000, mass: 1}
      ],
      profile: {
        strategy: {
          humanize: true
        }
      },
      memory: {
        lastPosition: {x: 1000, y: 1000},
        stuckTicks: 5
      },
      random: randomSequence([0, 0])
    });

    expect(actions[0].target).to.deep.equal({x: 1360, y: 1000});
  });

  it('should keep wandering briefly after a stuck recovery starts', () => {
    const memory = {
      forceWanderTicks: 1
    };
    const actions = planBotActions({
      player: {
        x: 1000,
        y: 1000,
        massTotal: 80
      },
      game: {
        width: 5000,
        height: 5000
      },
      visiblePlayers: [],
      visibleFood: [
        {x: 1020, y: 1000, mass: 1}
      ],
      profile: {
        strategy: {
          humanize: true
        }
      },
      memory,
      random: randomSequence([0, 0])
    });

    expect(actions[0].target).to.deep.equal({x: 1360, y: 1000});
    expect(memory.forceWanderTicks).to.equal(0);
  });

  it('should use probability gates for humanized bot skills', () => {
    const actions = planBotActions({
      player: {
        x: 100,
        y: 200,
        massTotal: 300
      },
      game: {
        width: 5000,
        height: 5000
      },
      visibleFood: [
        {x: 300, y: 220}
      ],
      profile: {
        strategy: {
          humanize: true,
          splitMassThreshold: 220,
          ejectMassThreshold: 180,
          ejectMassChance: 0.1,
          splitChance: 0.1
        }
      },
      random: function () {
        return 0.9;
      }
    });

    expect(actions).to.deep.equal([
      {type: 'moveTarget', target: {x: 300, y: 220}}
    ]);
  });

  it('should not add idle chat for humanized bot moments', () => {
    const actions = planBotActions({
      player: {
        x: 100,
        y: 100,
        massTotal: 80
      },
      game: {
        width: 5000,
        height: 5000
      },
      visiblePlayers: [
        {x: 130, y: 100, massTotal: 220, name: 'Large_Player'}
      ],
      profile: {
        name: 'Doudou_Bot',
        strategy: {
          humanize: true,
          dangerRadius: 300,
          chatChance: 1,
          chatLines: {
            fleeing: ['先撤一下']
          }
        }
      },
      random: function () {
        return 0;
      }
    });

    expect(actions).to.deep.equal([
      {type: 'moveTarget', target: {x: 0, y: 100}}
    ]);
  });

  it('should emit existing socket protocol events for bot actions', () => {
    const socket = createFakeSocket();

    applyBotActions(socket, [
      {type: 'moveTarget', target: {x: 10, y: 20}},
      {type: 'ejectMass'},
      {type: 'split'},
      {type: 'attemptConnection'},
      {type: 'chat', sender: 'Bot_Action', message: '我吃到了食物，质量 +3'}
    ]);

    expect(socket.emitted).to.deep.equal([
      {eventName: '0', payload: {x: 10, y: 20}},
      {eventName: '1', payload: undefined},
      {eventName: '2', payload: undefined},
      {eventName: '3', payload: undefined},
      {eventName: 'playerChat', payload: {sender: 'Bot_Action', message: '我吃到了食物，质量 +3'}}
    ]);
  });

  it('should convert world move targets into player-relative socket input', () => {
    const socket = createFakeSocket();

    applyBotActions(socket, [
      {type: 'moveTarget', target: {x: 180, y: 120}}
    ], {
      player: {x: 100, y: 100}
    });

    expect(socket.emitted).to.deep.equal([
      {eventName: '0', payload: {x: 80, y: 20}}
    ]);
  });

  it('should keep humanized move input large enough to feel like mouse steering', () => {
    const socket = createFakeSocket();

    applyBotActions(socket, [
      {type: 'moveTarget', target: {x: 110, y: 100}}
    ], {
      player: {x: 100, y: 100},
      profile: {
        strategy: {
          humanize: true,
          moveInputMinDistance: 180
        }
      }
    });

    expect(socket.emitted).to.deep.equal([
      {eventName: '0', payload: {x: 180, y: 0}}
    ]);
  });
});
