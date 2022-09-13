import axios from 'axios';

const API_URL = 'http://localhost:8081'
const LS_KEYS = {
  REGISTRY: '1',
}
// ls utils
const get = (k, dv) => JSON.parse(localStorage.getItem(k)) || dv
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v))

// registries
export const getRegistries = () => get(LS_KEYS.REGISTRY, [])
export const addRegistry = async ({alias, registryUrl, username, password, bypassCORS}) => {
  const r = getRegistries()
  r.push({ alias, registryUrl, username, password, bypassCORS })
  set(LS_KEYS.REGISTRY, r)
}
export const getCatalog = async (registryId) => {
  const registry = getRegistries()[registryId]
  const {registryUrl, username, password, bypassCORS} = registry
  if (bypassCORS) {
    const {data} = await axios.get(`${API_URL}/catalog?url=${registryUrl}&u=${username}&p=${password}`)
    return data
  } else {
    const {data} = await axios.get(`${registryUrl}/v2/_catalog?n=100000`, {
      headers: {
        authorization: `Basic ${btoa(`${username}:${password}`)}`
      }
    })
    return data
  }
}
export const getTags = async (registryId, repository) => {
  const registry = getRegistries()[registryId]
  const {registryUrl, username, password, bypassCORS} = registry
  if (bypassCORS) {
    const {data} = await axios.get(`${API_URL}/tags?url=${registryUrl}&u=${username}&p=${password}&repository=${repository}`)
    return data
  } else {
    const {data} = await axios.get(`${registryUrl}/v2/${repository}/tags/list`, {
      headers: {
        authorization: `Basic ${btoa(`${username}:${password}`)}`
      }
    })
    return data
  }
}
export const getManifest = async (registryId, repository, tag) => {
  const registry = getRegistries()[registryId]
  const {registryUrl, username, password, bypassCORS} = registry
  if (bypassCORS) {
    const {data} = await axios.get(`${API_URL}/manifest?url=${registryUrl}&u=${username}&p=${password}&repository=${repository}&tag=${tag}`)
    return data
  } else {
    const {data} = await axios.get(`${registryUrl}/v2/${repository}/manifests/${tag}`, {
      headers: {
        authorization: `Basic ${btoa(`${username}:${password}`)}`,
        accept: 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json'
      }
    })
    return data
  }
}
export const deleteManifest = async (registryId, repository, digest) => {
  const registry = getRegistries()[registryId]
  const {registryUrl, username, password, bypassCORS} = registry
  if (bypassCORS) {
    const {data} = await axios.delete(`${API_URL}/manifest?url=${registryUrl}&u=${username}&p=${password}&repository=${repository}&digest=${digest}`)
    return data
  } else {
    const url = `${registryUrl}/v2/${repository}/manifests/${digest}`
    const {data} = await axios.delete(url, {
      headers: {
        authorization: `Basic ${btoa(`${username}:${password}`)}`
      }
    })
    return data
  }
}
