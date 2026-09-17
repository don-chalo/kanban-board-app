# Cors Specification

## Purpose

Lets browser single-page apps call the kanban API from another origin without being blocked by the same-origin policy.

## Requirements

### Requirement: Cross-origin access allowed
The API SHALL include CORS response headers on its responses so browser clients from any origin can read them, and SHALL answer browser preflight `OPTIONS` requests with the methods and headers those clients request.

#### Scenario: Any origin is allowed
- **WHEN** a browser client sends a request carrying an `Origin` header
- **THEN** the response includes `Access-Control-Allow-Origin` permitting that origin

#### Scenario: Preflight succeeds
- **WHEN** a browser sends a preflight `OPTIONS` request listing the methods and headers it intends to use
- **THEN** the API responds with `2xx` and `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` covering what was requested

#### Scenario: Existing endpoints keep working
- **WHEN** a client that is not a browser (or is same-origin) calls any existing endpoint
- **THEN** the endpoint behaves as before, with the added CORS headers not altering its contract