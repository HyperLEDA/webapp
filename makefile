GIT_VERSION = `git rev-parse --short main`

run:
	yarn dev

build:
	yarn build

gen:
	yarn run openapi-ts -i http://dm2.sao.ru:81/api/openapi.json -o ./src/clients/backend

image-build:
	docker build . -t ghcr.io/hyperleda/hyperleda-webapp:$(GIT_VERSION)
	docker tag ghcr.io/hyperleda/hyperleda-webapp:$(GIT_VERSION) ghcr.io/hyperleda/hyperleda-webapp:latest

image-push:
	docker push ghcr.io/hyperleda/hyperleda-webapp:$(GIT_VERSION)
	docker push ghcr.io/hyperleda/hyperleda-webapp:latest
