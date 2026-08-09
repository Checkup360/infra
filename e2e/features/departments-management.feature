Feature: Department management in Dashboard
  As an organization admin
  I want to create, search, edit, and delete departments in the dashboard
  So that I can organize company teams and collaborators

  Background:
    Given there is an organization with a signed-in organization admin for departments

  Scenario: Org Admin creates a new department
    When the org admin creates a department named "Recursos Humanos"
    Then the department "Recursos Humanos" appears in the department list

  Scenario: Org Admin searches departments
    Given there are departments named "Tecnología" and "Finanzas"
    When the org admin searches for "Tecnología"
    Then only the "Tecnología" department card is visible

  Scenario: Org Admin edits a department name
    Given there is a department named "Operaciones"
    When the org admin edits the department name from "Operaciones" to "Logística y Operaciones"
    Then the updated department name "Logística y Operaciones" is displayed

  Scenario: Org Admin deletes an unassigned department
    Given there is an unassigned department named "Departamento Temporal"
    When the org admin deletes the department "Departamento Temporal"
    Then the department "Departamento Temporal" is removed from the department list
