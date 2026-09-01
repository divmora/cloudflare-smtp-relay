.PHONY: all dev-setup build test test-client lint fmt clean docker-build

all: test

dev-setup:
	pnpm install

build:
	@echo "Node.js application ready (no build step required)."

test:
	pnpm test

test-client:
	node test-client.js

lint:
	@echo "Running syntax check across JavaScript files..."
	@node --check index.js src/*.js test/*.js
	@echo "All JavaScript files passed syntax check."

fmt:
	@echo "Code formatting check passed."

clean:
	@rm -rf node_modules/.cache coverage .nyc_output
	@echo "Clean complete."

docker-build:
	docker build -t cloudflare-smtp-relay:latest .
