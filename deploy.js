const child_process = require('child_process');
const packageJson = require('./be/package.json');

const DOCKER_REGISTRY = 'dockerer123456'; // or your private registry url
const {name, version} = packageJson;
const imageTag = `${DOCKER_REGISTRY}/${name}:${version}.${Date.now()}`

const cmds = [
  `rm -rf dist && mkdir dist`,
  // copy backend to dist
  `cp be/index.js dist/index.js`,
  `cp be/package.json dist/package.json`,
  `cp be/yarn.lock dist/yarn.lock`,
  // copy frontend to dist
  `cd fe && yarn build`,
  `cd .. && cp -r fe/dist dist/public`,
  // copy dockerfile to dist
  `cp Dockerfile dist/Dockerfile`,
  `cd dist`,
  `docker build -t ${imageTag} .`,
  `docker push ${imageTag}`
]

console.log(`Deploying ${imageTag}`);
const process = child_process.exec(cmds.join(' && '));
process.stdout.on('data', console.log)
process.stderr.on('data', console.log)
process.on('exit', (code, signal) => {
  console.log('on exit', code, signal)
  console.log(imageTag)
})
