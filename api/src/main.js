import 'babel-polyfill'
import ApiBuilder from 'claudia-api-builder'
import generateDescriptor from './generateDescriptor'
import InstallationService from './InstallationService'
import MessageHandler from './messageHandling'
import { DynamoDB } from 'aws-sdk'
import notification from './notificationBuilder'
import GetInstallationQuery from './db/installations/GetInstallation'
import authenticate from './authenticate'

const api = new ApiBuilder()
module.exports = api

api.get('/descriptor', (request) => {
  const host = request.normalizedHeaders.host
  const stage = request.context.stage
  return generateDescriptor(`https://${host}/${stage}`)
})

api.post('/installed', async (request) => {
  console.log(`Installed: ${JSON.stringify(request.body)}`)
  await new InstallationService(getDBClient()).install(request.body)
})

api.post('/updated', (request) => {
  console.log(`Reinstalled: ${JSON.stringify(request.body)}`)
})

api.delete('/installed/{oauthId}', async (request) => {
  console.log(`Uninstalled: ${request.pathParams.oauthId}`)
  await new InstallationService(getDBClient()).uninstall(request.pathParams.oauthId)
})

api.post('/message', async (request) => {
  try {
    console.log(`Message received: ${JSON.stringify(request.body)}, Authorization: ${request.normalizedHeaders.authorization}`)
    const db = getDBClient()
    const installation = await new GetInstallationQuery(db).execute(request.body.oauth_client_id)
    authenticate(installation, request.normalizedHeaders.authorization)

    const handler = new MessageHandler(db)
    const message = request.body.item.message
    message.message = trimMentionName(message.message)
    const response = await handler.handle(installation, request.body)

    console.log(`Response: ${response.message}`)
    return response
  } catch (e) {
    console.error(e.stack)
    let errorMessage = 'Ooops! It looks like something went wrong. ' + e
    if (process.env.maintainers) {
      errorMessage = process.env.maintainers + ' ' + errorMessage
    }
    return notification.red.text(errorMessage)
  }
}, { success: { contentType: 'application/json; charset=UTF-8' } })

const getDBClient = () => new DynamoDB.DocumentClient({
  service: new DynamoDB({ apiVersion: '2012-08-10', region: process.env.dynamoDBRegion })
})

const trimMentionName = (message) => {
  const nameRegExp = new RegExp(`^.*?@${process.env.addonName}`, 'i')
  return message.replace(nameRegExp, '').replace(/\s+/g, ' ').trim()
}
