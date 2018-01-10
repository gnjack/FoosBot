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
    { id: 'match#4', teams: [['my name', 'a'], ['b', '<xss>']], scores: [10, 0] },
    { id: 'match#5', teams: [['my name'], ['a', 'b', '<xss>']], scores: [5, 10] },
    { id: 'match#6', teams: [['my name'], ['<xss>']], scores: [10, 9] }
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
<li>Skill level 12.912, ranked 2nd. (μ 28.7, σ 5.3)</li>
<li>Played 6 matches. Won 4, Lost 2, W/L Ratio 2.00.</li>
<li>Best win streak: 2, Worst lose streak: 1</li>
<li>45 goals scored, 34 goals conceded</li>
<li>Flawless victories: 2</li>
<li>Laps of shame: 1</li>
</ul><br />
Achievements: <ul><li>🚼 - Newbie! (First game played)</li><li>👑 - King of the League (Reached 1st Place in the league)</li><li>💮 - On the Podium (Reached top 3 in the league)</li><li>😌 - Close Shave (Won by a single goal)</li></ul>`)
    t.end()
  })
}

for (const command of [' stats ', 'global stats']) {
  test('StatsHandler # get global stats using ' + command, async t => {
    setupHandler()
    body.item.message.message = command
    db.query.withArgs(sinon.match({ TableName: matchHistoryTableName })).returns({ promise: () => exampleHistory })

    const response = await messageHandler.handle(installation, body)

    t.htmlResponse(response, `Global stats: <ul>
<li>4 competitors</li>
<li>6 matches played</li>
<li>79 goals scored</li>
<li>FoosBot has predicted 100.0% of matches without new players correctly (83.3% overall)</li>
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
<li>Skill level -0.774, ranked 4th. (μ 16.6, σ 5.8)</li>
<li>Played 5 matches. Won 1, Lost 4, W/L Ratio 0.25.</li>
<li>Best win streak: 1, Worst lose streak: 3</li>
<li>24 goals scored, 45 goals conceded</li>
<li>Laps of shame: 2</li>
</ul><br />
Achievements: <ul><li>🚼 - Newbie! (First game played)</li></ul>`)
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
