## MODIFIED Requirements

### Requirement: Cross-origin access allowed
The API SHALL include CORS response headers only for origins listed in its `CORS_ORIGIN` configuration, echoing the requesting origin with `Vary: Origin`, and SHALL answer browser preflight `OPTIONS` requests with the methods and headers those clients request. Requests without an `Origin` header SHALL pass through normally. When `CORS_ORIGIN` is absent or empty, cross-origin browser reads SHALL carry no `Access-Control-Allow-Origin` (same-machine only); same-origin and non-browser clients SHALL be unaffected.

#### Scenario: Any origin is allowed
- **WHEN** a browser client sends a request carrying an `Origin` header present in `CORS_ORIGIN`
- **THEN** the response includes `Access-Control-Allow-Origin` permitting that origin (origins absent from the list receive no header)

#### Scenario: Unlisted origin is denied
- **WHEN** a browser client sends a request carrying an `Origin` header absent from `CORS_ORIGIN`
- **THEN** the response carries no `Access-Control-Allow-Origin` header

#### Scenario: Missing configuration denies cross-origin reads
- **WHEN** `CORS_ORIGIN` is absent or empty and a browser client sends a cross-origin request
- **THEN** the response carries no `Access-Control-Allow-Origin` header

#### Scenario: Preflight succeeds
- **WHEN** a browser sends a preflight `OPTIONS` request from a listed origin listing the methods and headers it intends to use
- **THEN** the API responds with `2xx` and `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` covering what was requested

#### Scenario: Existing endpoints keep working
- **WHEN** a client that is not a browser (or is same-origin) calls any existing endpoint
- **THEN** the endpoint behaves as before, with the added CORS headers not altering its contract
