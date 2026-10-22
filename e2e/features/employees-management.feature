Feature: Employee and member management in Dashboard
  As an organization admin
  I want to list, filter, view details, and assign departments to organization members
  So that I can manage staff organization and access control

  Background:
    Given there is an organization with a signed-in admin and registered members

  Scenario: Org Admin views employees list and summary KPIs
    When the org admin navigates to the employees page
    Then the employee table displays the registered members and summary KPIs

  Scenario: Org Admin filters employees by search and department
    When the org admin filters employees by email search
    Then only the matching employee is displayed in the table

  Scenario: Org Admin views employee detail page and assigns a department
    Given there is an unassigned member in the organization
    When the org admin assigns the member to a department
    Then the member detail page displays the updated department assignment

  Scenario: Standard member without admin role is denied access to the dashboard
    When a member without admin role navigates to the dashboard
    Then they see the access denied page with a 403 error
