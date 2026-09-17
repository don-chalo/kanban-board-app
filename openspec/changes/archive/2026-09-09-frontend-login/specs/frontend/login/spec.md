## Purpose

The web app's entry point: it identifies the user through an email and takes them to the boards page after a successful login.

## ADDED Requirements

### Requirement: Email login form
The web app SHALL display a login page with an email field and a submit action, centered within the viewport, using a high-contrast yellow-on-black scheme. The web app SHALL validate the entered email before sending any request: blank and malformed emails are rejected and shown as an error. On a valid email, the web app SHALL submit it to the API login endpoint and, on success, redirect the user to the boards page.

#### Scenario: Successful login redirects to boards
- **WHEN** the user enters a valid email and submits the form
- **THEN** the web app sends the email to the login API and, on success, redirects to the boards page

#### Scenario: Email is validated before submitting
- **WHEN** the user submits a blank or malformed email
- **THEN** the web app shows an error and sends no request

#### Scenario: Email is normalized before submitting
- **WHEN** the user enters an email with surrounding whitespace or mixed case
- **THEN** the request sends the email trimmed and lowercased

#### Scenario: Identity is retained after login
- **WHEN** the login succeeds
- **THEN** the returned identity is stored so subsequent pages can identify the user

#### Scenario: Failed login keeps the user on the page
- **WHEN** the API responds with an error
- **THEN** the user stays on the login page and sees an error message

### Requirement: Boards placeholder page
The web app SHALL provide a boards page route that renders a placeholder message until the boards list is implemented, and SHALL be the destination after a successful login.

#### Scenario: Placeholder message is shown
- **WHEN** the user lands on the boards page
- **THEN** the page shows a work-in-progress message about the future boards list