
export default class DeleteInstallation {
  constructor (db) {
    this._db = db
  }

  async execute (oauthId) {
    await this._db.delete({
      TableName: process.env.installationsTableName,
      Key: { oauthId }
    }).promise()
  }
}
