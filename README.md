# KatalogizaceFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.15.

## Development

### Run

`npm run start`

for a local dev server. Navigate to `http://localhost:4200/`.
The application will automatically reload if you change any of the source files.

## Build & Run

### Build

First define configuration in environment variables

```shell
export APP_DEV_MODE=false
export APP_ENV_NAME="local npm run build"
export APP_ENV_CODE="l-nrb"
export APP_API_SERVICE_URL="https://ai-katalogizace-api.trinera.cloud"
export APP_API_SERVICE_KEY="API-KEY"
```

Now run `npm run build` to build the project.

The build artifacts will be stored in the `dist/` directory.

The environment configuration from `APP_*` variables will be stored into `dist/katalogizace-frontend/assets/env.json`

### Run

To test the the app you've just built

`npx serve dist/katalogizace-frontend/browser -l 8181`

And open in browser

`http://localhost:8181`

## Docker Build & Run

### Build

```
docker build -t katalogizace-frontend .
```

possibly including version tag

```
docker build -t trinera/katalogizace-frontend:0.0.0 .
```

or including version tag and tag `latest`

```
docker build -t trinera/katalogizace-frontend:latest -t trinera/katalogizace-frontend:0.0.0 .
```

### Push to Dockerhub

Only if you have write access to Dockerhub repository trinera/katalogizace-frontend.
You don't need this to run localy built Docker image.

```
docker push trinera/katalogizace-frontend:0.0.0
docker push trinera/anakon:latest
```

### Run Docker image

#### Local image

Run locally built Docker image

##### Run

```
docker run -p 1234:80 \
  -e APP_DEV_MODE=false \
  -e APP_API_SERVICE_URL=https://ai-katalogizace-api.trinera.cloud \
  -e APP_API_SERVICE_KEY=API-KEY \
trinera/katalogizace-frontend
```

##### Run exact version:

```
docker run -p 1234:80 \
  -e APP_DEV_MODE=false \
  -e APP_API_SERVICE_URL=https://ai-katalogizace-api.trinera.cloud \
  -e APP_API_SERVICE_KEY=API-KEY \
trinera/katalogizace-frontend:latest
```

or

```
docker run -p 1234:80 \
  -e APP_DEV_MODE=false \
  -e APP_API_SERVICE_URL=https://ai-katalogizace-api.trinera.cloud \
  -e APP_API_SERVICE_KEY=API-KEY \
trinera/katalogizace-frontend:0.0.0
```

#### Image pulled from Docker Hub

Run image that someone built and pushed to Dockerhub.

##### Run

```
docker pull trinera/katalogizace-frontend:latest
docker run -p 1234:80 \
  -e APP_DEV_MODE=false \
  -e APP_API_SERVICE_URL=https://ai-katalogizace-api.trinera.cloud \
  -e APP_API_SERVICE_KEY=API-KEY \
trinera/katalogizace-frontend
```

And open in browser

`http://localhost:1234`

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
