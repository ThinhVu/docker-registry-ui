import axios from 'axios';

const API_URL = 'http://localhost:8081'

export const getAccessToken = () => localStorage.getItem('access_token')
export const setAccessToken = (v) => localStorage.setItem('access_token', v)
const getConfig = () => ({ headers: { authorization: getAccessToken() } })
export const getRegistries = async () => {
  const {data} = await axios.get(`${API_URL}/registries`, getConfig())
  return data
}
export const addRegistry = async (registryUrl, username, password) => {
  const {data} = await axios.post(`${API_URL}/registry`, { registryUrl, username, password }, getConfig)
  return data
}
export const getCatalog = async (registryId) => {
  const {data} = await axios.get(`${API_URL}/catalog?registryId=${registryId}`, getConfig())
  return data
}
export const getTags = async (registryId, repository) => {
  const {data} = await axios.get(`${API_URL}/tags?registryId=${registryId}&repository=${repository}`, getConfig())
  return data
}
export const getManifest = async (registryId, repository, tag) => {
  const {data} = await axios.get(`${API_URL}/manifest?registryId=${registryId}&repository=${repository}&tag=${tag}`, getConfig())
  return data
}
export const deleteManifest = async (registryId, repository, digest) => {
  const {data} = await axios.delete(`${API_URL}/manifest?registryId=${registryId}&repository=${repository}&digest=${digest}`, getConfig())
  return data
}
