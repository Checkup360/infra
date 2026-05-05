Feature: Sign in
  As an administrator
  I want to sign in with my credentials
  So that I can access the system

  Background:
    Given the administrator has valid credentials from the environment

  Scenario: Administrator signs in successfully
    Given the administrator opens the sign-in page
    When they submit their email and password
    Then they are signed in with full administrator access

  Scenario: Wrong password shows feedback
    Given the administrator opens the sign-in page
    When they submit their email and a wrong password
    Then they see an authentication error

  Scenario: Unauthorized access to backoffice redirects after login
    Given the administrator opens the backoffice page
    When they are redirected to login
    And they submit their email and password
    Then they see the backoffice page