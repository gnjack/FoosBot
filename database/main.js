import { DynamoDB } from 'aws-sdk'
import { readFileSync } from 'fs'

const createTablesIfNeeded = async () => {
  console.log(`Checking current status of tables.`)
  const currentTables = await db.listTables().promise()

  await createTableIfNeeded(currentTables, 'installations')
  await createTableIfNeeded(currentTables, 'match-history')
}

async function createTableIfNeeded (currentTables, baseName) {
  const schema = loadSchema(baseName)
  if (currentTables.TableNames.includes(schema.TableName)) {
    console.log(`Table ${schema.TableName} already exists.`)
  } else {
    await createTable(schema)
  }
}

function loadSchema (baseName) {
  const fileExt = process.argv[2] ? `${process.argv[2]}.json` : 'json'
  const filePath = `./tableSchemas/${baseName}.${fileExt}`
  const json = readFileSync(filePath)
  const schema = JSON.parse(json)
  if (!schema.TableName) {
    throw new Error(`Could not find TableName in ${filePath}`)
  }
  return schema
}

async function createTable ({TimeToLiveSpecification, TableName, ...schema}) {
  console.log(`Creating table '${TableName}'.`)
  await db.createTable({TableName, ...schema}).promise()
  console.log(`Waiting for table to exist (this may take a few minutes).`)
  await db.waitFor('tableExists', {TableName}).promise()
  if (TimeToLiveSpecification) {
    console.log(`Setting Time To Live specification for ${TableName}.`)
    await db.updateTimeToLive({TableName, TimeToLiveSpecification}).promise()
  }
  console.log(`Table ${TableName} has been created!`)
}

const db = new DynamoDB({ apiVersion: '2012-08-10', region: 'eu-west-1' })
createTablesIfNeeded()
