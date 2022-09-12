const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const axios = require('axios')
require('dotenv').config()

const registries = []
for (const defaultRegistry of (process.env.DEFAULT_REGISTRIES || '').split(',')) {
  if (!defaultRegistry)
    continue;

  const [protocol, domain, username, password] = defaultRegistry.split(':')
  registries.push({
    registryUrl: `${protocol}:${domain}`,
    username,
    password
  })
}

const app = express()
app.use(cors())
app.use(bodyParser.json())

const auth = (req, res, next) => {
  const authorization = req.headers.authorization
  if (!authorization || authorization !== process.env.ACCESS_TOKEN) {
    return next('Unauthorized')
  }
  next()
}
const btoa = (str) => Buffer.from(str).toString('base64')
const resErr = (e, res) => {
  console.error(e)
  res.status(500).end(e.message)
}
// get all registry
app.get('/registries', auth, async (req, res) => res.send(registries))
// add registry
app.post('/registry', auth, async (req, res) => {
  try {
    const {registryUrl, username, password} = req.body
    if (!registryUrl || !username || !password) {
      throw new Error('Invalid registry')
    }
    registries.push({registryUrl, username, password})
    res.status(204).end()
  } catch (e) {
    resErr(e, res)
  }
})
// return repositories in registry
app.get('/catalog', auth, async (req, res) => {
  try {
    const registry = registries[+req.query.registryId]
    const {registryUrl, username, password} = registry
    const {data} = await axios.get(`${registryUrl}/v2/_catalog?n=100000}`, {
      headers: {
        authorization: `Basic ${btoa(`${username}:${password}`)}`
      }
    })
    res.json(data)
  } catch (e) {
    resErr(e, res)
  }
})
// return tags in repository
app.get('/tags', auth, async (req, res) => {
  try {
    const {registryId, repository} = req.query
    const registry = registries[+registryId]
    const {registryUrl, username, password} = registry
    const {data} = await axios.get(`${registryUrl}/v2/${repository}/tags/list`, {
      headers: {
        authorization: `Basic ${btoa(`${username}:${password}`)}`
      }
    })
    res.json(data)
  } catch (e) {
    resErr(e, res)
  }
})
// return manifest of specified tag
app.get('/manifest', auth, async (req, res) => {
  try {
    const {registryId, repository, tag} = req.query
    const {registryUrl, username, password } = registries[+registryId]
    const {data} = await axios.get(`${registryUrl}/v2/${repository}/manifests/${tag}`, {
      headers: {
        authorization: `Basic ${btoa(`${username}:${password}`)}`,
        accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
      }
    })
    res.json(data)
  } catch (e) {
    resErr(e, res)
  }
})
// delete manifest of specified digest
app.delete('/manifest', auth, async (req, res) => {
  try {
    const {registryId, repository, digest} = req.query
    const {registryUrl, username, password } = registries[+registryId]
    // https://docker-registry.getthesecond.xyz/v2/tvux-me/manifests/sha256:6c1fbcfb58c39a9a635690e121ab9fd6d4fdfc3b32bbc85bc25f2d106c11cf9a
    const url = `${registryUrl}/v2/${repository}/manifests/${digest}`
    const {data} = await axios.delete(url, {
      headers: {
        authorization: `Basic ${btoa(`${username}:${password}`)}`
      }
    })
    res.json(data)
  } catch (e) {
    resErr(e, res)
  }
})

app.listen(8081, () => console.log('ready on 8081'))
