GIT_VERSION = `git rev-parse --short HEAD`

run:
	yarn dev

build:
	yarn build

check:
	yarn run prettier --check src
	yarn eslint src

fix:
	yarn run prettier --write src
	yarn eslint --fix src

gen:
	yarn run openapi-ts -i http://leda.sao.ru/api/openapi.json -o ./src/clients/backend
	yarn run openapi-ts -i http://leda.sao.ru/admin/api/openapi.json -o ./src/clients/admin

image-build:
	docker build . -t ghcr.io/hyperleda/hyperleda-webapp:$(GIT_VERSION)
	docker tag ghcr.io/hyperleda/hyperleda-webapp:$(GIT_VERSION) ghcr.io/hyperleda/hyperleda-webapp:latest

image-push:
	docker push ghcr.io/hyperleda/hyperleda-webapp:$(GIT_VERSION)
	docker push ghcr.io/hyperleda/hyperleda-webapp:latest
