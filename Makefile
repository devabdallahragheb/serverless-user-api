.PHONY: install build start test clean deploy

install:
	@echo "📦 Installing dependencies..."
	cd handlers && npm install

build:
	@echo "🔨 Building SAM application..."
	sam build

start: build
	@echo "🚀 Starting SAM local API..."
	@echo "API available at http://127.0.0.1:3000"
	sam local start-api --docker-network dynmo-crud_default

test:
	@echo "🧪 Running local tests..."
	chmod +x scripts/test-lambda-local.sh
	./scripts/test-lambda-local.sh

invoke-create:
	@echo "🎯 Invoking CreateUserFunction..."
	sam local invoke CreateUserFunction --event events/create-user.json

invoke-list:
	@echo "🎯 Invoking ListUsersFunction..."
	sam local invoke ListUsersFunction --event events/list-users.json

clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf .aws-sam
	rm -rf node_modules
	rm -rf handlers/node_modules

deploy:
	@echo "☁️  Deploying to AWS..."
	cd terraform && terraform init && terraform apply

help:
	@echo "Available commands:"
	@echo "  make install       - Install dependencies"
	@echo "  make build        - Build SAM application"
	@echo "  make start        - Start SAM local API"
	@echo "  make test         - Run local tests"
	@echo "  make invoke-create - Test create function"
	@echo "  make invoke-list  - Test list function"
	@echo "  make clean        - Clean build artifacts"
	@echo "  make deploy       - Deploy to AWS with Terraform"
