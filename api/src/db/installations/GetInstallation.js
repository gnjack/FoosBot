
export default class GetInstallation {
  constructor (db) {
    this._db = db
  }

  async execute (oauthId) {
    const result = await this._db.get({
      TableName: process.env.installationsTableName,
      Key: { oauthId }
    }).promise()
    return result.Item
  }
}
