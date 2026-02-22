check:
	@output=$$(yarn run --silent prettier --check src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn run --silent eslint src 2>&1) || { echo "$$output"; exit 1; }

fix:
	@output=$$(yarn run --silent prettier --write src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn run --silent eslint --fix src 2>&1) || { echo "$$output"; exit 1; }


GIT_VERSION = `git rev-parse --short HEAD`

run:
	yarn dev

build:
	yarn build

gen:
	yarn run openapi-ts -i http://leda.sao.ru/api/openapi.json -o ./src/clients/backend
	yarn run openapi-ts -i http://leda.sao.ru/admin/api/openapi.json -o ./src/clients/admin

image-build:
	docker build . -t ghcr.io/hyperleda/hyperleda-webapp:$(GIT_VERSION)
	docker tag ghcr.io/hyperleda/hyperleda-webapp:$(GIT_VERSION) ghcr.io/hyperleda/hyperleda-webapp:latest

image-push:
	docker push ghcr.io/hyperleda/hyperleda-webapp:$(GIT_VERSION)
	docker push ghcr.io/hyperleda/hyperleda-webapp:latest
