import test from '../test'
import sinon from 'sinon'
import MessageHandler from '.'

const matchHistoryTableName = process.env.matchHistoryTableName = 'matchHistoryTableName'
const roomId = 12321
let db, messageHandler, installation, body

const exampleHistory = {
  Items: [
    { id: 'match#1', teams: [['my name'], ['<xss>']], scores: [10, 5] },
    { id: 'match#2', teams: [['my name'], ['<xss>']], scores: [10, 0] },
    { id: 'match#3', teams: [['my name'], ['a']], scores: [0, 10] },
    { id: 'match#4', teams: [['my name'], ['b']], scores: [10, 0] }
  ]
}

function setupHandler () {
  installation = {
    oauthId: 'oauthId',
    oauthSecret: 'oauthSecret',
    rooms: {
      12321: { members: { '<xss>': '<XSS>', a: 'A', b: 'B', 'my name': 'My Name' } }
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
    query: sinon.stub().returns({ promise: () => { return { Items: [] } } })
  }
  messageHandler = new MessageHandler(db)
}

for (const command of ['my stats ', ' stats My Name', 'stats me']) {
  test('StatsHandler # get my stats using ' + command, async t => {
    setupHandler()
    body.item.message.message = command
    db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => exampleHistory })

    const response = await messageHandler.handle(installation, body)

    t.htmlResponse(response, `Player stats for My Name: <ul>
<li>Skill level 13.106, ranked 1st. (μ 29.1, σ 5.3)</li>
<li>Played 4 matches. Won 3. Lost 1.</li>
<li>Longest win streak: 2</li>
<li>Longest lose streak: 1</li>
<li>Flawless victories: 2</li>
<li>Laps of shame: 1</li>
</ul>`)
    t.end()
  })
}

test('StatsHandler # get stats using mention', async t => {
  setupHandler()
  body.item.message.message = '@xss stats'
  body.item.message.mentions = [{ mention_name: '@xss', name: '<XSS>' }]
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => exampleHistory })

  const response = await messageHandler.handle(installation, body)

  t.htmlResponse(response, `Player stats for &lt;XSS&gt;: <ul>
<li>Skill level -0.800, ranked 4th. (μ 18.8, σ 6.5)</li>
<li>Played 2 matches. Won 0. Lost 2.</li>
<li>Longest win streak: 0</li>
<li>Longest lose streak: 2</li>
<li>Flawless victories: 0</li>
<li>Laps of shame: 1</li>
</ul>`)
  t.end()
})

test('StatsHandler # unknown name', async t => {
  setupHandler()
  body.item.message.message = 'Unknown Name stats'
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => exampleHistory })

  const response = await messageHandler.handle(installation, body)

  t.textResponse(response, `Sorry, I don't know who unknown name is.`)
  t.end()
})

test('StatsHandler # unknown name using mention', async t => {
  setupHandler()
  body.item.message.message = '@unknown stats'
  body.item.message.mentions = [{ mention_name: '@unknown', name: 'Unknown Name' }]
  db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => exampleHistory })

  const response = await messageHandler.handle(installation, body)

  t.textResponse(response, `Sorry, I don't know who unknown name is.`)
  t.end()
})
