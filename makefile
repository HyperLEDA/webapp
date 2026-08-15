check:
	@output=$$(yarn run --silent prettier --check apps/web/src apps/admin/src packages/lib/src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/web eslint src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/admin eslint src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/lib eslint src 2>&1) || { echo "$$output"; exit 1; }
	@yarn test:web
	@yarn test:admin
	@yarn build:web
	@yarn build:admin

fix:
	@output=$$(yarn run --silent prettier --write apps/web/src apps/admin/src packages/lib/src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/web eslint --fix src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/admin eslint --fix src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/lib eslint --fix src 2>&1) || { echo "$$output"; exit 1; }

run-web:
	yarn dev:web

run-admin:
	yarn dev:admin

gen:
	yarn run openapi-ts -i http://leda.sao.ru/api/openapi.json -o ./packages/lib/src/clients/backend
	yarn run openapi-ts -i http://leda.sao.ru/admin/api/openapi.json -o ./packages/lib/src/clients/admin

new-branch:
	@read -p "Branch name: " branch_name && \
	branch_name=$${branch_name// /-} && \
	base=$$(git remote show origin | sed -n '/HEAD branch/s/.*: //p') && \
	echo "Selecting $$base branch as default" && \
	git fetch origin $$base && \
	git checkout -b $$branch_name origin/$$base && \
	git push -u origin $$branch_name
