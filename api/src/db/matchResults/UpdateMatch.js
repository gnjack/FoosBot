
export default class UpdateMatch {
  constructor (db) {
    this._db = db
  }

  async execute (match) {
    const updateParams = {
      TableName: process.env.matchHistoryTableName,
      Key: { id: match.id },
      UpdateExpression: 'SET teams = :t, scores = :s',
      ExpressionAttributeValues: {
        ':t': match.teams,
        ':s': match.scores
      }
    }
    await this._db.update(updateParams).promise()
  }
}
