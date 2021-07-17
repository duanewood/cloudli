import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

const secrets = {}

const client = new SecretManagerServiceClient()

export async function getSecret(key) {
  const name =  `projects/${projectId}/secrets/${key}/versions/latest`
  // console.log('getSecret: name:', name)
  let secret = secrets[name]
  if (secret) {
    return secret
  } else {
    const [version] = await client.accessSecretVersion({ name })
    if (!version || ! version.payload || !version.payload.data) {
      return null 
    }
    secret = JSON.parse(version.payload.data.toString())
    secrets[name] = secret
    return secret  
  }
}
