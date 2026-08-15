check:
	@output=$$(yarn exec prettier --check apps/web/src apps/admin/src packages/lib/src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/web eslint src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/admin eslint src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/lib eslint src 2>&1) || { echo "$$output"; exit 1; }
	@yarn test:web
	@yarn test:admin
	@yarn build:web
	@yarn build:admin

fix:
	@output=$$(yarn exec prettier --write apps/web/src apps/admin/src packages/lib/src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/web eslint --fix src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/admin eslint --fix src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(yarn workspace @hyperleda/lib eslint --fix src 2>&1) || { echo "$$output"; exit 1; }

run-web:
	yarn dev:web

run-admin:
	yarn dev:admin

gen:
	yarn workspace @hyperleda/lib gen:backend
	yarn workspace @hyperleda/lib gen:admin

new-branch:
	@read -p "Branch name: " branch_name && \
	branch_name=$${branch_name// /-} && \
	base=$$(git remote show origin | sed -n '/HEAD branch/s/.*: //p') && \
	echo "Selecting $$base branch as default" && \
	git fetch origin $$base && \
	git checkout -b $$branch_name origin/$$base && \
	git push -u origin $$branch_name
