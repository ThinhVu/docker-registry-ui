const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const axios = require('axios')
require('dotenv').config()

const app = express()
app.use(cors())
app.use(bodyParser.json())

const btoa = (str) => Buffer.from(str).toString('base64')
const resErr = (e, res) => {
  console.error(e.response.data.errors)
  res.status(500).end(JSON.stringify(e.response.data.errors[0].message))
}
const getOpt = (u, p, extra) => ({
  headers: {
    authorization: `Basic ${btoa(`${u}:${p}`)}`,
    ...(extra ? extra: {})
  }
})
// return repositories in registry
app.get('/catalog', async (req, res) => {
  try {
    const {url, u, p} = req.query
    const {data} = await axios.get(`${url}/v2/_catalog?n=100000}`, getOpt(u, p))
    res.json(data)
  } catch (e) {
    resErr(e, res)
  }
})
// return tags in repository
app.get('/tags', async (req, res) => {
  try {
    const {url, u, p, repository} = req.query
    const {data} = await axios.get(`${url}/v2/${repository}/tags/list`, getOpt(u, p))
    res.json(data)
  } catch (e) {
    resErr(e, res)
  }
})
// return manifest of specified tag
app.get('/manifest', async (req, res) => {
  try {
    const {url, u, p, repository, tag} = req.query
    const response = await axios.get(`${url}/v2/${repository}/manifests/${tag}`, getOpt(u, p, {
      accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json, application/vnd.docker.distribution.manifest.list.v2+json, application/vnd.oci.image.index.v1+json'
    }))
    if (response.headers['docker-content-digest']) {
      response.data.contentDigest = response.headers['docker-content-digest']
    }
    res.json(response.data)
  } catch (e) {
    resErr(e, res)
  }
})
// delete manifest of specified digest
app.delete('/manifest', async (req, res) => {
  try {
    const {url, u, p, repository, digest} = req.query
    console.log('remove', digest)
    const {data} = await axios.delete(`${url}/v2/${repository}/manifests/${digest}`, getOpt(u, p, {
      accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
    }))
    res.json(data)
  } catch (e) {
    resErr(e, res)
  }
})

app.listen(8081, () => console.log('ready on 8081'))
