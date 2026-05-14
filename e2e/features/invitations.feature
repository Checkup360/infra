Feature: Invitations
  As an administrator
  I want to create and use invitations
  So that new users receive the right access

  Background:
    Given the administrator is signed in to the backoffice invitations page
    And there is an organization for invitations

  Scenario: Sysadmin invitation creates a sysadmin account
    Given the administrator prepares a new sysadmin invitation recipient
    When they create a sysadmin invitation from the backoffice
    And the invited user registers with the invitation
    Then the invited user is signed in as a sysadmin

  Scenario: Sysadmin invitation creates an organization admin account
    Given the administrator prepares a new organization admin invitation recipient
    When they create an organization admin invitation from the backoffice
    And the invited user registers with the invitation
    Then the invited user is signed in as an organization admin

  Scenario: Sysadmin invitation creates an organization member account
    Given the administrator prepares a new organization member invitation recipient
    When they create an organization member invitation from the backoffice
    And the invited user registers with the invitation
    Then the invited user is signed in as an organization member

  Scenario: Invitation cannot be used with a different email
    Given the administrator prepares a new organization member invitation recipient
    When they create an organization member invitation from the backoffice
    And the invited user tries to register with a different email
    Then registration is rejected

  Scenario: Organization admin invitation creates another organization admin account
    Given there is a signed-in organization admin for invitations
    When the organization admin opens the dashboard invitations page
    And they prepare a new organization admin invitation recipient
    And they create an organization admin invitation from the dashboard
    And the invited user registers with the invitation
    Then the invited user is signed in as an organization admin

  Scenario: Organization admin invitation creates another organization member account
    Given there is a signed-in organization admin for invitations
    When the organization admin opens the dashboard invitations page
    And they prepare a new organization member invitation recipient
    And they create an organization member invitation from the dashboard
    And the invited user registers with the invitation
    Then the invited user is signed in as an organization member
