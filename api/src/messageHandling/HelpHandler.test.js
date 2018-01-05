import test from '../test'
import sinon from 'sinon'
import MessageHandler from '.'

const roomId = 12321
let db, messageHandler, installation, body

function setupHandler () {
  installation = {
    oauthId: 'oauthId',
    oauthSecret: 'oauthSecret',
    rooms: {
      12321: {
        members: {
          'sonic the hedgehog': 'Sonic the Hedgehog',
          'tails the fox': 'Tails the Fox',
          'knuckles the echidna': 'Knuckles the Echidna',
          'my name': 'My Name'
        }
      }
    }
  }
  body = {
    oauth_client_id: 'oauthId',
    item: {
      message: {
        mentions: [],
        from: { name: 'My Name' }
      },
      room: {
        id: roomId
      }
    }
  }
  db = {
    update: sinon.stub().returns({ promise: () => {} })
  }
  messageHandler = new MessageHandler(db)
}
for (const command of ['help', 'hi @FoosBot']) {
  test('HelpHandler # ' + command, async t => {
    setupHandler()
    body.item.message.message = command

    const response = await messageHandler.handle(installation, body)
    var expected = `Hey My, here's what I understand: <ul>
<li><b>help</b></li>
<li><b>add <i>[competitor]</i></b></li>
<li><b>list</b> - leaderboard of competitors and their current skill level</li>
<li><b><i>[red team]</i> vs <i>[blue team]</i></b> - start a new match</li>
<li><b>red <i>[score]</i> blue <i>[score]</i></b> - record the results of current match</li>
<li><b>cancel</b> - cancel current match</li>
<li><b><i>[competitor]</i> stats</b> - show detailed stats for a player</li>
</ul>`
    t.htmlResponse(response, expected)
    t.end()
  })
}
