check:
	@output=$$(bun --silent run prettier --check apps/web/src apps/admin/src packages/lib/src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(bun --silent run oxlint . 2>&1) || { echo "$$output"; exit 1; }
	@bun run test:web
	@bun run test:admin
	@bun run build:web
	@bun run build:admin

fix:
	@output=$$(bun --silent run prettier --write apps/web/src apps/admin/src packages/lib/src 2>&1) || { echo "$$output"; exit 1; }
	@output=$$(bun --silent run oxlint --fix . 2>&1) || { echo "$$output"; exit 1; }

run-web:
	bun run dev:web

run-admin:
	bun run dev:admin

gen:
	bun run openapi-ts -i http://leda.sao.ru/api/openapi.json -o ./packages/lib/src/clients/backend
	bun run openapi-ts -i http://leda.sao.ru/admin/api/openapi.json -o ./apps/admin/src/clients/admin

new-branch:
	@read -p "Branch name: " branch_name && \
	branch_name=$${branch_name// /-} && \
	base=$$(git remote show origin | sed -n '/HEAD branch/s/.*: //p') && \
	echo "Selecting $$base branch as default" && \
	git fetch origin $$base && \
	git checkout -b $$branch_name origin/$$base && \
	git push -u origin $$branch_name
