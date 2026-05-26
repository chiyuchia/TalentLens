.PHONY: backend-dev frontend-dev backend-test compose-up compose-down

backend-dev:
	cd backend && flask --app wsgi run --host 0.0.0.0 --port 8000 --debug

frontend-dev:
	cd frontend && npm run dev

backend-test:
	cd backend && pytest

compose-up:
	docker compose -f deploy/docker-compose.yml up -d --build

compose-down:
	docker compose -f deploy/docker-compose.yml down

