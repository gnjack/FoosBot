
export default class DeleteMatch {
  constructor (db) {
    this._db = db
  }

  async execute (match) {
    await this._db.delete({
      TableName: process.env.matchHistoryTableName,
      Key: { id: match.id }
    }).promise()
  }
}
